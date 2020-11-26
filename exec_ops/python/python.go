package python

import (
	"../../skyhook"
	"../../exec_ops"

	"fmt"
	"io"
	"sync"
)

// Data about one Apply call.
// Single goroutine reads stdout and passes information based on pendingKey structs.
type pendingKey struct {
	key string
	outputs map[string][]skyhook.Data
	builders map[string][]skyhook.ChunkBuilder
	cond *sync.Cond
	done bool
}

type JobPacket struct {
	Key string
	Type string
	Length int
}

type ResponsePacket struct {
	Type string
	Key string
	OutputKey string
	Length int
}

type PythonOp struct {
	node skyhook.ExecNode

	cmd *skyhook.Cmd
	stdin io.WriteCloser
	stdout io.ReadCloser

	pending map[string]*pendingKey

	// error interacting with python process
	// after being set, this error is returned to any future Apply calls
	err error

	// lock on stdin
	writeLock sync.Mutex

	// lock on internal structures (pending, err, counter, etc.)
	mu sync.Mutex
}

func NewPythonOp(cmd *skyhook.Cmd, url string, node skyhook.ExecNode) (*PythonOp, error) {
	stdin := cmd.Stdin()
	stdout := cmd.Stdout()

	// write meta packet
	var metaPacket struct {
		InputTypes []skyhook.DataType
		OutputTypes []skyhook.DataType
		Code string
	}
	metaPacket.Code = node.Params
	metaPacket.OutputTypes = node.DataTypes

	datasets, err := exec_ops.GetParentDatasets(url, node)
	if err != nil {
		return nil, fmt.Errorf("error getting parent datasets: %v", err)
	}
	for _, ds := range datasets {
		metaPacket.InputTypes = append(metaPacket.InputTypes, ds.DataType)
	}

	if err := skyhook.WriteJsonData(metaPacket, stdin); err != nil {
		return nil, err
	}

	op := &PythonOp{
		node: node,
		cmd: cmd,
		stdin: stdin,
		stdout: stdout,
		pending: make(map[string]*pendingKey),
	}
	go op.readLoop()
	return op, nil
}

func (e *PythonOp) readLoop() {
	var err error

	for {
		var resp ResponsePacket
		err = skyhook.ReadJsonData(e.stdout, &resp)
		if err != nil {
			break
		}

		if resp.Type == "data_data" {
			// read the datas
			datas := make([]skyhook.Data, len(e.node.DataTypes))
			for i, dtype := range e.node.DataTypes {
				dtype = skyhook.DataImpls[dtype].ChunkType
				datas[i], err = skyhook.DataImpls[dtype].DecodeStream(e.stdout)
				if err != nil {
					break
				}
			}
			if err != nil {
				break
			}

			// append the datas to the existing ones for this output key
			e.mu.Lock()
			pk := e.pending[resp.Key]
			if pk.builders[resp.OutputKey] == nil {
				pk.builders[resp.OutputKey] = make([]skyhook.ChunkBuilder, len(e.node.DataTypes))
				for i, dtype := range e.node.DataTypes {
					pk.builders[resp.OutputKey][i] = skyhook.DataImpls[dtype].Builder()
				}
			}
			for i, builder := range pk.builders[resp.OutputKey] {
				err = builder.Write(datas[i])
				if err != nil {
					break
				}
			}
			e.mu.Unlock()
			if err != nil {
				break
			}
		} else if resp.Type == "data_finish" {
			e.mu.Lock()
			pk := e.pending[resp.Key]
			pk.outputs[resp.OutputKey] = make([]skyhook.Data, len(e.node.DataTypes))
			for i, builder := range pk.builders[resp.OutputKey] {
				pk.outputs[resp.OutputKey][i], err = builder.Close()
				if err != nil {
					break
				}
			}
			e.mu.Unlock()
			if err != nil {
				break
			}
		} else if resp.Type == "finish" {
			e.mu.Lock()
			pk := e.pending[resp.Key]
			pk.done = true
			pk.cond.Broadcast()
			e.mu.Unlock()
		}
	}

	e.mu.Lock()
	if e.err == nil {
		e.err = err
	}
	for _, pk := range e.pending {
		pk.cond.Broadcast()
	}
	e.mu.Unlock()

}

func (e *PythonOp) Apply(key string, inputs []skyhook.Item) (map[string][]skyhook.Data, error) {
	// add pendingKey (and check if already err)
	e.mu.Lock()
	if e.err != nil {
		e.mu.Unlock()
		return nil, e.err
	}

	pk := &pendingKey{
		key: key,
		outputs: make(map[string][]skyhook.Data),
		builders: make(map[string][]skyhook.ChunkBuilder),
		cond: sync.NewCond(&e.mu),
	}
	e.pending[key] = pk
	e.mu.Unlock()

	// write init packet
	e.writeLock.Lock()
	err := skyhook.WriteJsonData(JobPacket{
		Key: key,
		Type: "init",
	}, e.stdin)
	e.writeLock.Unlock()
	if err != nil {
		return nil, err
	}

	inputDatas := make([]skyhook.Data, len(inputs))
	for i, input := range inputs {
		data, err := input.LoadData()
		if err != nil {
			return nil, err
		}
		inputDatas[i] = data
	}

	err = skyhook.SynchronizedReader(inputDatas, 32, func(pos int, length int, datas []skyhook.Data) error {
		e.writeLock.Lock()

		skyhook.WriteJsonData(JobPacket{
			Key: key,
			Type: "job",
			Length: length,
		}, e.stdin)

		// just check the err on last write
		var err error
		for _, data := range datas {
			err = data.EncodeStream(e.stdin)
		}

		e.writeLock.Unlock()

		return err
	})

	// write finish packet
	// check err from SynchronizedReader after this packet is written
	e.writeLock.Lock()
	skyhook.WriteJsonData(JobPacket{
		Key: key,
		Type: "finish",
	}, e.stdin)
	e.writeLock.Unlock()

	if err != nil {
		return nil, err
	}

	e.mu.Lock()
	for !pk.done && e.err == nil {
		pk.cond.Wait()
	}
	e.mu.Unlock()

	if e.err != nil {
		return nil, e.err
	}

	return pk.outputs, nil
}

func (e *PythonOp) Close() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stdin.Close()
	e.stdout.Close()
	if e.cmd != nil {
		e.cmd.Wait()
		e.cmd = nil
		e.err = fmt.Errorf("closed")
	}
}

func init() {
	skyhook.ExecOpImpls["python"] = skyhook.ExecOpImpl{
		Requirements: func(url string, node skyhook.ExecNode) map[string]int {
			return nil
		},
		Prepare: func(url string, node skyhook.ExecNode) (skyhook.ExecOp, error) {
			cmd := skyhook.Command("pynode-"+node.Name, skyhook.CommandOptions{}, "python3", "exec_ops/python/run.py")
			op, err := NewPythonOp(cmd, url, node)
			return op, err
		},
	}
}
