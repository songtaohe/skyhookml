import utils from './utils.js';

export default {
	data: function() {
		return {
			comps: [],
			addForm: {},
		};
	},
	props: ['mtab'],
	created: function() {
		this.fetch();
	},
	methods: {
		fetch: function() {
			utils.request(this, 'GET', '/pytorch/components', null, (data) => {
				this.comps = data;
			});
		},
		showAddModal: function() {
			this.addForm = {
				name: '',
			};
			$(this.$refs.addModal).modal('show');
		},
		add: function() {
			utils.request(this, 'POST', '/pytorch/components', this.addForm, () => {
				$(this.$refs.addModal).modal('hide');
				this.fetch();
			});
		},
		deleteComp: function(compID) {
			utils.request(this, 'DELETE', '/pytorch/components/'+compID, null, () => {
				this.fetch();
			});
		},
		selectComp: function(comp) {
			this.$router.push('/ws/'+this.$route.params.ws+'/models/comp/'+comp.ID);
		},
	},
	watch: {
		tab: function() {
			if(this.mtab != '#m-components-panel') {
				return;
			}
			this.fetch();
		},
	},
	template: `
<div>
	<div class="my-1">
		<button type="button" class="btn btn-primary" v-on:click="showAddModal">Add Component</button>
		<div class="modal" tabindex="-1" role="dialog" ref="addModal">
			<div class="modal-dialog" role="document">
				<div class="modal-content">
					<div class="modal-body">
						<form v-on:submit.prevent="add">
							<div class="form-group row">
								<label class="col-sm-4 col-form-label">Name</label>
								<div class="col-sm-8">
									<input class="form-control" type="text" v-model="addForm.name" />
								</div>
							</div>
							<div class="form-group row">
								<div class="col-sm-8">
									<button type="submit" class="btn btn-primary">Add Component</button>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
	<table class="table">
		<thead>
			<tr>
				<th>Name</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="comp in comps">
				<td>{{ comp.Name }}</td>
				<td>
					<button v-on:click="selectComp(comp)" class="btn btn-primary">Manage</button>
					<button v-on:click="deleteComp(comp.ID)" class="btn btn-danger">Delete</button>
				</td>
			</tr>
		</tbody>
	</table>
</div>
	`,
};
