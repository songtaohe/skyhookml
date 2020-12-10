function request(comp, method, endpoint, params, successFunc, completeFunc, opts) {
	var args = {
		type: method,
		url: endpoint,
		error: function(req, status, errorMsg) {
			comp.$emit('error', errorMsg);
		},
	};
	if(params) {
		args.data = params;
		if(typeof(args.data) === 'string') {
			args.processData = false;
		}
	}
	if(successFunc) {
		args.success = successFunc;
	}
	if(completeFunc) {
		args.complete = completeFunc;
	}
	if(opts) {
		if(opts.dataType) {
			args.dataType = opts.dataType;
		}
	}
	return $.ajax(args);
}

export default {
	request: request,
};
