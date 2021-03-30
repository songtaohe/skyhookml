import utils from './utils.js';

export default {
	data: function() {
		return {
			name: '',
			op: null,
			categories: [{
				ID: "basic",
				Name: "Basic",
				Ops: ['filter', 'detection_filter', 'simple_tracker', 'reid_tracker', 'resample', 'segmentation_mask'],
			}, {
				ID: "model",
				Name: "Model",
				Ops: ['pytorch_train', 'pytorch_infer', 'pytorch_yolov3_train', 'yolov3_train', 'yolov3_infer', 'unsupervised_reid'],
			}, {
				ID: "video",
				Name: "Video Manipulation",
				Ops: ['video_sample', 'render', 'cropresize'],
			}, {
				ID: "code",
				Name: "Code",
				Ops: ['python'],
			}, {
				ID: "convert",
				Name: "Convert",
				Ops: ['from_yolo', 'to_yolo', 'from_coco', 'to_coco', 'from_catfolder', 'to_catfolder'],
			}, {
				ID: "debug",
				Name: "Debug",
				Ops: ['virtual_debug'],
			}],
		};
	},
	created: function() {
		for(let category of this.categories) {
			category.Ops = category.Ops.map((opID) => this.$globals.ops[opID]);
		}
	},
	mounted: function() {
		$(this.$refs.modal).modal('show');
	},
	methods: {
		createNode: function() {
			var params = {
				Name: this.name,
				Op: this.op.ID,
				Params: '',
				Parents: null,
				Workspace: this.$route.params.ws,
			};
			utils.request(this, 'POST', '/exec-nodes', JSON.stringify(params), () => {
				$(this.$refs.modal).modal('hide');
				this.$emit('closed');
			});
		},
		selectOp: function(op) {
			this.op = op;
		},
	},
	template: `
<div class="modal" tabindex="-1" role="dialog" ref="modal">
	<div class="modal-dialog modal-xl" role="document">
		<div class="modal-content">
			<div class="modal-body">
				<form v-on:submit.prevent="createNode">
					<div class="row mb-2">
						<label class="col-sm-2 col-form-label">Name</label>
						<div class="col-sm-10">
							<input v-model="name" class="form-control" type="text" />
						</div>
					</div>
					<div class="row mb-2">
						<label class="col-sm-2 col-form-label">Op</label>
						<div class="col-sm-10">
							<ul class="nav nav-tabs">
								<li v-for="category in categories" class="nav-item">
									<a
										class="nav-link"
										data-toggle="tab"
										:href="'#add-node-cat-' + category.ID"
										role="tab"
										>
										{{ category.Name }}
									</a>
								</li>
							</ul>
							<div class="tab-content">
								<div v-for="category in categories" class="tab-pane" :id="'add-node-cat-' + category.ID">
									<table class="table table-row-select">
										<thead>
											<tr>
												<th>Name</th>
												<th>Description</th>
											</tr>
										</thead>
										<tbody>
											<tr
												v-for="x in category.Ops"
												:class="{selected: op != null && op.ID == x.ID}"
												v-on:click="selectOp(x)"
												>
												<td>{{ x.Name }}</td>
												<td>{{ x.Description }}</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
					<template v-if="op">
						<div class="row mb-2">
							<label class="col-sm-2 col-form-label">Inputs</label>
							<div class="col-sm-10">
								<table class="table">
									<thead>
										<tr>
											<th>Name</th>
											<th>Type(s)</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="input in op.Inputs">
											<td>{{ input.Name }}</td>
											<td>
												<span v-if="input.DataTypes && input.DataTypes.length > 0">
													{{ input.DataTypes }}
												</span>
												<span v-else>
													Any
												</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
						<div class="row mb-2">
							<label class="col-sm-2 col-form-label">Outputs</label>
							<div class="col-sm-10">
								<table class="table">
									<thead>
										<tr>
											<th>Name</th>
											<th>Type</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="output in op.Outputs">
											<td>{{ output.Name }}</td>
											<td>{{ output.DataType }}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</template>
					<div class="form-group row">
						<div class="col-sm-10">
							<button type="submit" class="btn btn-primary">Create Node</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
	`,
};
