import sys
sys.path.append('./')

import json
import numpy
import os, os.path
import random
import requests
import skimage.io, skimage.transform
import struct
import sys

import torch

sys.path.append('./exec_ops/pytorch/')
import model
import util

node_id = int(sys.argv[1])

device = torch.device('cuda:0')
#device = torch.device('cpu')
model_path = 'models/{}.pt'.format(node_id)
save_dict = torch.load(model_path)
net = model.Net(save_dict['arch'], save_dict['comps'], save_dict['example_inputs'])
net.to(device)

net.load_state_dict(save_dict['model'])
net.eval()

stdin = sys.stdin.detach()
while True:
	header = stdin.read(8)
	if not header:
		break
	left_count, right_count = struct.unpack('>II', header)
	buf = stdin.read(left_count*64*64*3)
	left_arr = numpy.frombuffer(buf, dtype='uint8').reshape((left_count, 64, 64, 3))
	buf = stdin.read(right_count*64*64*3)
	right_arr = numpy.frombuffer(buf, dtype='uint8').reshape((right_count, 64, 64, 3))

	left_inp = torch.from_numpy(left_arr.transpose(0, 3, 1, 2).copy())
	right_inp = torch.from_numpy(right_arr.transpose(0, 3, 1, 2).copy())
	inputs = [left_inp, right_inp]
	util.inputs_to_device(inputs, device)
	y = net(*inputs)
	y = y[0][0]['probs']
	print('json'+json.dumps(y.tolist()), flush=True)