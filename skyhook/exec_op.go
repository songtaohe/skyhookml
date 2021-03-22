package skyhook

import (
	"runtime"
)

type ExecOp interface {
	Parallelism() int
	Apply(task ExecTask) error
	Close()
}

// A wrapper for a simple exec op that needs no persistent state.
// So the wrapper just wraps a function, along with desired parallelism.
type SimpleExecOp struct {
	ApplyFunc func(ExecTask) error
	P int
}
func (e SimpleExecOp) Parallelism() int {
	if e.P == 0 {
		return runtime.NumCPU()
	}
	return e.P
}
func (e SimpleExecOp) Apply(task ExecTask) error {
	return e.ApplyFunc(task)
}
func (e SimpleExecOp) Close() {}

type ExecTask struct {
	// For incremental operations, this must be the output key that will be created by this task.
	// TODO: operation may need to produce multiple output keys at some task
	// For other operations, I think this can be arbitrary, but usually it's still related to the output key
	Key string

	// Generally maps from input name to list of items in each dataset at that input
	Items map[string][][]Item

	Metadata string
}

type ExecOpImpl struct {
	Requirements func(url string, node ExecNode) map[string]int
	// items is: input name -> input dataset index -> items in that dataset
	GetTasks func(url string, node ExecNode, items map[string][][]Item) ([]ExecTask, error)
	// initialize an ExecOp
	Prepare func(url string, node ExecNode, outputDatasets map[string]Dataset) (ExecOp, error)
	// determine the output names/types given current inputs and configuration
	GetOutputs func(url string, node ExecNode) []ExecOutput

	// optional; if set, op is considered "incremental"
	Incremental bool
	GetOutputKeys func(node ExecNode, inputs map[string][][]string) []string
	GetNeededInputs func(node ExecNode, outputs []string) map[string][][]string

	// Docker image name
	ImageName func(url string, node ExecNode) (string, error)

	// Optional system to provide customized state to store in ExecNode jobs.
	// For example, when training a model, we may want to store the loss history.
	GetJobOp func(url string, node ExecNode) JobOp
}

var ExecOpImpls = make(map[string]ExecOpImpl)

func GetExecOpImpl(opName string) *ExecOpImpl {
	impl, ok := ExecOpImpls[opName]
	if !ok {
		return nil
	}
	return &impl
}
