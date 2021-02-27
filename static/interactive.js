import utils from './utils.js';
import RenderItem from './render-item.js';

export default {
	components: {
		'render-item': RenderItem,
	},
	data: function() {
		return {
			node: null,
			datasets: null,
			items: {},
			limit: 0,
		};
	},
	created: function() {
		const nodeID = this.$route.params.nodeid;
		utils.request(this, 'GET', '/exec-nodes/'+nodeID, null, (node) => {
			this.node = node;
		});

		utils.request(this, 'GET', '/exec-nodes/'+nodeID+'/datasets', null, (datasets) => {
			this.datasets = datasets;
			let items = {};
			for(var name in this.datasets) {
				items[name] = [];
			}
			this.items = items;
		});

		this.fetchItems();
		this.interval = setInterval(this.fetchItems, 1000);
	},
	destroyed: function() {
		clearInterval(this.interval);
	},
	methods: {
		fetchItems: function() {
			if(!this.datasets) {
				return;
			}
			for(var name in this.datasets) {
				let ds = this.datasets[name];
				utils.request(this, 'GET', '/datasets/'+ds.ID+'/items', null, (items) => {
					this.items[name] = items;
				});
			}
		},
		loadMore: function() {
			let minItems = Infinity;
			for(var name in this.items) {
				minItems = Math.min(minItems, this.items[name].length);
			}
			console.log(this.limit, minItems);
			if(this.limit < minItems) {
				this.limit += 4;
				return;
			}
			utils.request(this, 'POST', '/exec-nodes/'+this.node.ID+'/incremental', {
				count: 4,
			});
			this.limit += 4;
		},
	},
	computed: {
		itemLists: function() {
			// group items into rows of 4 for each output name
			// also limit the number of items in each output to this.limit
			let items = {};
			for(var name in this.items) {
				let cur = this.items[name].slice(0, this.limit);
				let row = null;
				items[name] = [];
				cur.forEach((item) => {
					if(!row) {
						row = [];
						items[name].push(row);
					}
					row.push(item);
					if(row.length >= 4) {
						row = null;
					}
				});
			}
			return items;
		},
	},
	template: `
<div>
	<template v-if="node && datasets">
		<h2>Node: {{ node.Name }}</h2>
		<div v-for="(itemList, name) in itemLists">
			<h3>{{ name }}</h3>
			<div v-for="row in itemList" class="explore-results-row">
				<div v-for="item in row" class="explore-results-col">
					<render-item v-bind:dataType="item.Dataset.DataType" v-bind:item="item"></render-item>
				</div>
			</div>
		</div>
		<button type="button" class="btn btn-primary" v-on:click="loadMore">Load More</button>
	</template>
</div>
	`,
};