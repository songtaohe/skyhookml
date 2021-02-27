import utils from './utils.js';

export default {
	data: function() {
		return {
			node: null,
			fraction: '',
		};
	},
	created: function() {
		const nodeID = this.$route.params.nodeid;
		utils.request(this, 'GET', '/exec-nodes/'+nodeID, null, (node) => {
			this.node = node;
			try {
				let s = JSON.parse(this.node.Params);
				this.fraction = s.Fraction;
			} catch(e) {}
		});
	},
	methods: {
		save: function() {
			let params = JSON.stringify({
				Fraction: this.fraction,
			});
			utils.request(this, 'POST', '/exec-nodes/'+this.node.ID, JSON.stringify({
				Params: params,
			}));
		},
	},
	template: `
<div class="small-container m-2">
	<template v-if="node != null">
		<div class="form-group row">
			<label class="col-sm-2 col-form-label">Fraction</label>
			<div class="col-sm-10">
				<input v-model="fraction" type="text" class="form-control">
			</div>
		</div>
		<button v-on:click="save" type="button" class="btn btn-primary">Save</button>
	</template>
</div>
	`,
};