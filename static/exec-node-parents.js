import utils from './utils.js';

export default {
	data: function() {
		return {
			selected: '',
			options: [],
		};
	},
	props: [
		'node', 'inputIdx', 'nodes', 'datasets',
	],
	created: function() {
		for(let dsID in this.datasets) {
			let ds = this.datasets[dsID];
			if(ds.Type == 'computed') {
				continue;
			}
			this.options.push({
				'Label': 'Dataset: ' + ds.Name,
				'Obj': {'Type': 'd', 'ID': ds.ID},
			});
		}
		for(let nodeID in this.nodes) {
			if(nodeID == this.node.ID) {
				continue;
			}
			let node = this.nodes[nodeID];
			node.Outputs.forEach((output) => {
				this.options.push({
					'Label': 'Node: ' + node.Name + '['+output.Name+']',
					'Obj': {
						'Type': 'n',
						'ID': node.ID,
						'Name': output.Name,
					},
				});
			});
		}
	},
	methods: {
		add: function() {
			let idx = parseInt(this.selected);
			this.$emit('add', this.options[idx].Obj);
		},
	},
	watch: {
		node: function() {
			this.selected = '';
		},
	},
	template: `
<table class="table table-sm">
	<thead>
		<tr><th colspan="2">{{ node.Inputs[inputIdx].Name }}</th></tr>
	</thead>
	<tbody>
		<tr v-for="(parent, i) in node.Parents[inputIdx]" :key="i">
			<template v-if="parent.Type == 'd'">
				<td>Dataset: {{ datasets[parent.ID].Name }}</td>
			</template>
			<template v-else-if="parent.Type == 'n'">
				<td>Node: {{ nodes[parent.ID].Name }}[{{ parent.Name }}]</td>
			</template>
			<td><button type="button" class="btn btn-danger btn-sm" v-on:click="$emit('remove', i)">Remove</button></td>
		</tr>
		<tr>
			<td>
				<select v-model="selected" class="form-control">
					<template v-for="(option, i) in options">
						<option :value="i">{{ option.Label }}</option>
					</template>
				</select>
			</td>
			<td><button type="button" class="btn btn-success btn-sm" v-on:click="add">Add</button></td>
		</tr>
	</tbody>
</table>
	`,
};
