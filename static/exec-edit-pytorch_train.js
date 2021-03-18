import utils from './utils.js';
import PytorchModel from './pytorch-model.js';
import PytorchDataset from './pytorch-dataset.js';
import PytorchAugment from './pytorch-augment.js';
import PytorchTrain from './pytorch-train.js';

export default {
	components: {
		'pytorch-model': PytorchModel,
		'pytorch-dataset': PytorchDataset,
		'pytorch-augment': PytorchAugment,
		'pytorch-train': PytorchTrain,
	},
	data: function() {
		return {
			node: null,
			params: null,
			// list of {Name, DataType}
			parents: [],
			addForms: null,
		};
	},
	created: function() {
		this.resetForm();

		const nodeID = this.$route.params.nodeid;
		utils.request(this, 'GET', '/exec-nodes/'+nodeID, null, (node) => {
			this.node = node;
			let params = {};
			try {
				params = JSON.parse(this.node.Params);
			} catch(e) {}
			if(!params.ArchID) {
				params.ArchID = null;
			}
			if(!params.Dataset) {
				params.Dataset = {
					Op: 'default',
					Params: '',
				};
			}
			if(!params.Augment) {
				params.Augment = [];
			}
			if(!params.Train) {
				params.Train = {
					Op: 'default',
					Params: '',
				};
			}
			this.params = params;
		});
	},
	methods: {
		resetForm: function() {
			this.addForms = {
				inputIdx: '',
				inputOptions: '',
			};
		},
		save: function() {
			utils.request(this, 'POST', '/exec-nodes/'+this.node.ID, JSON.stringify({
				Params: JSON.stringify(this.params),
			}));
		},
	},
	template: `
<div class="m-2">
	<template v-if="node != null">
		<ul class="nav nav-tabs" id="m-nav" role="tablist">
			<li class="nav-item">
				<a class="nav-link active" id="pytorch-model-tab" data-toggle="tab" href="#pytorch-model-panel" role="tab">Model</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" id="pytorch-dataset-tab" data-toggle="tab" href="#pytorch-dataset-panel" role="tab">Datasets</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" id="pytorch-augment-tab" data-toggle="tab" href="#pytorch-augment-panel" role="tab">Data Augmentation</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" id="pytorch-train-tab" data-toggle="tab" href="#pytorch-train-panel" role="tab">Training</a>
			</li>
		</ul>
		<div class="tab-content mx-1">
			<div class="tab-pane fade show active" id="pytorch-model-panel" role="tabpanel">
				<pytorch-model v-bind:node="node" v-model="params.ArchID"></pytorch-model>
			</div>
			<div class="tab-pane fade" id="pytorch-dataset-panel" role="tabpanel">
				<pytorch-dataset v-bind:node="node" v-model="params.Dataset.Params"></pytorch-dataset>
			</div>
			<div class="tab-pane fade" id="pytorch-augment-panel" role="tabpanel">
				<pytorch-augment v-bind:node="node" v-model="params.Augment"></pytorch-augment>
			</div>
			<div class="tab-pane fade" id="pytorch-train-panel" role="tabpanel">
				<pytorch-train v-bind:node="node" v-model="params.Train.Params"></pytorch-train>
			</div>
		</div>
		<button v-on:click="save" type="button" class="btn btn-primary">Save</button>
	</template>
</div>
	`,
};
