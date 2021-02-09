//==========================================================================================================================
//  
//  avnsSetFieldValue.js [Cint]
//
//
//	Dependency:
//	            Create a custom record named "DateTime" with id: customrecord_datetime, no name field.
//              Add a datetime field named "Date Time" with id custrecord_datetime

//==========================================================================================================================

//PEM200831 -->
Date.prototype.addMilliseconds=function(value){this.setMilliseconds(this.getMilliseconds() + value);return this;};
Date.prototype.addMinutes=function(value){return this.addMilliseconds(value * 60000);};
Date.prototype.LocalTime=function(timezone, format){ // return date object if format is null.
	var rec = nlapiCreateRecord('customrecord_datetime');
	var servertime = this;
	rec.setDateTimeValue('custrecord_datetime', nlapiDateToString(servertime, 'datetimetz') , 'America/Los_Angeles');
	var localtime = rec.getDateTimeValue('custrecord_datetime', timezone);
	localtime = nlapiStringToDate(localtime, 'datetimetz');
	var minutes = ((localtime.getTime() - servertime.getTime()) / 60000).toFixed(0);
	var st = servertime.addMinutes(minutes);
	if (avnsIsEmpty(format)) {
		return st;
	}
	return nlapiDateToString(st, format);
}
//PEM200831 <--

function UnveilErrorObject(err,maxlength){
	var msg = {};
	if ( err instanceof nlobjError ){
		msg.code = err.getCode();
		msg.detail=err.getDetails();
		msg.id=	err.getInternalId();
		msg.stackTrace=err.getStackTrace();
		msg.userevent=err.getUserEvent();
	} else if (err instanceof Error){
		msg.code=err.name;
		msg.detail=	( err.description != null ? err.description + ': ':'') + ( err.message != null ? err.message:'');
		msg.stackTrace=(err.fileName != null ? err.fileName + ': ':'') + (err.lineNumber != null ? err.lineNumber:'')
	}else{
		msg.detail = err.toString();
	}
	if(maxlength==null) maxlength==300;
	var str = JSON.stringify(msg);
	if(str.length>300)str=str.substr(0,295)+'...';
	return str;
}

//============================================================//
//	function: avnsIsEmpty
//	Comments: Helper function
//	inparams: object
//	Returnvalue: {boolean}
//============================================================//
function avnsIsEmpty(obj){
	if(obj == undefined)return true;
	if(obj == null)return true;
	if(obj.length == 0)return true;
	if(Object.prototype.toString.call(obj) == '[object Object]'){
		if(Object.keys(obj).length == 0)return true;
	}
	return false;
}
//============================================================//
//    function: SetFieldValue
//    Comments: MAIN WORKFLOW ACTION METHOD
//    inparams:
//    Returnvalue: {result}
//============================================================//
function SetFieldValue(){
 	var result = 'OK';
	nlapiLogExecution("DEBUG",arguments.callee.name,"BEGIN");
	try {
		var context = nlapiGetContext();
		var params = getInparams(context,['custscript_sfv_recordtype','custscript_sfv_recordid','custscript_sfv_field','custscript_sfv_value']);
		nlapiLogExecution('DEBUG', arguments.callee.name, 'params:' + JSON.stringify(params));//PEM200831
		result = SetFieldValueInternal(params);
	} catch (err) {
		nlapiLogExecution("ERROR", arguments.callee.name, UnveilErrorObject(err));
	}
	nlapiLogExecution("DEBUG",arguments.callee.name,"END");
	return result;
}
//============================================================//
//    function: SetFieldValueInternal
//    Comments:
//    inparams:
//    Returnvalue: {result}
//============================================================//
// function SetFieldValueInternal(params){
// 	var rec = nlapiGetNewRecord();
// 	var recordType = rec.getRecordType();
// 	var id = rec.getId();
// 	var value = nlapiLookupField(params.custscript_sfv_recordtype,params.custscript_sfv_recordid,params.custscript_sfv_field);
// 	if(avnsIsEmpty(value))value='';
// 	if(avnsIsEmpty(params.custscript_sfv_value))params.custscript_sfv_value='';
// 	if(value != params.custscript_sfv_value){
// 		nlapiLogExecution('DEBUG', 'nlapiSubmitField', 'nlapiSubmitField(' +  params.custscript_sfv_recordtype + ',' + params.custscript_sfv_recordid + ',' + params.custscript_sfv_field + ',' + params.custscript_sfv_value + ')');
// 		nlapiSubmitField(params.custscript_sfv_recordtype,params.custscript_sfv_recordid,params.custscript_sfv_field,params.custscript_sfv_value);
// 	}else{
// 		nlapiLogExecution('DEBUG', 'No update', 'old value and new value are equal ('+value+')');
// 	}
// }

function SetFieldValueInternal(params) { //PEM200831, PEM200902 Reformatted and rewritten
	var dateTypes = ['date', 'datetime', 'datetimetz', 'timeofday'];
	var rec = nlapiLoadRecord(params.custscript_sfv_recordtype, params.custscript_sfv_recordid);
	var newRecordType = nlapiGetRecordType();
	var fieldType = rec.getField(params.custscript_sfv_field).getType();
	var value = rec.getFieldValue(params.custscript_sfv_field);
	if (avnsIsEmpty(value)) {
		value = '';
	}
	var newValue = avnsIsEmpty(params.custscript_sfv_value) ? '' : params.custscript_sfv_value;

	if (value != newValue) {
		if (dateTypes.indexOf(fieldType) != -1) {
			var splitChar = (newValue.indexOf('T') != -1 ? 'T' : ' ');
			var datetimeArr = newValue.split(splitChar);
			var dateArr = datetimeArr[0].split('-');
			var timeArr = datetimeArr[1].split(':');
			var newDateTime = new Date(dateArr[0], dateArr[1] - 1, dateArr[2], timeArr[0], timeArr[1], timeArr[2]);

			newValue = newDateTime.LocalTime('America/Los_Angeles', fieldType);
			switch (fieldType) {
				case 'datetime' :
				case 'datetimetz' :
					nlapiLogExecution('DEBUG', arguments.callee.name, 'fieldType:' + fieldType + ', fieldValue:' + value + ',  rec.setDateTimeValue(' +  params.custscript_sfv_field + ', ' + newValue + ', true)');
					rec.setDateTimeValue(params.custscript_sfv_field, newValue);
					break;
				default:
					nlapiLogExecution('DEBUG', arguments.callee.name, 'fieldType:' + fieldType + ', fieldValue:' + value + ',  rec.setFieldValue(' +  params.custscript_sfv_field + ', ' + newValue + ', true)');
					rec.setFieldValue(params.custscript_sfv_field, newValue);
			}

			if (newRecordType != params.custscript_sfv_recordtype) {
				nlapiLogExecution('DEBUG', arguments.callee.name, 'nlapiSubmitRecord()');
				nlapiSubmitRecord(rec, true, true);
			}
		} else {
			nlapiLogExecution('DEBUG', arguments.callee.name, 'fieldType:' + fieldType + ', fieldValue:' + value + ',  nlapiSubmitField(' +  params.custscript_sfv_recordtype + ', ' + params.custscript_sfv_recordid + ', ' + params.custscript_sfv_field + ', ' + newValue + ', true)');
			nlapiSubmitField(params.custscript_sfv_recordtype, params.custscript_sfv_recordid,params.custscript_sfv_field, newValue, true);
		}

	} else {
		nlapiLogExecution('DEBUG', arguments.callee.name, 'No update, old value and new value for ' + params.custscript_sfv_field + ' are equal (' + value + ')');
	}

}

function SetFieldValueInternalOLD(params){
	var rec = nlapiGetNewRecord();
	var recordType = rec.getRecordType();
	var id = rec.getId();
	nlapiLogExecution('DEBUG', 'SetFieldValueInternalOLD', 'Current Record, recordType=' +  recordType + ', recordId=' + id);

	if(id == params.custscript_sfv_recordid){
		if(recordType == params.custscript_sfv_recordtype || (recordType == 'LEAD' && params.custscript_sfv_recordtype=='customer')){
			nlapiLogExecution('DEBUG', 'SetFieldValueInternalOLD', 'rec.setFieldValue('+ params.custscript_sfv_field + ',' + params.custscript_sfv_value+')');
			rec.setFieldValue(params.custscript_sfv_field,params.custscript_sfv_value);
		}
	}else{
		nlapiLogExecution('DEBUG', 'SetFieldValueInternalOLD', 'nlapiSubmitField(' +  params.custscript_sfv_recordtype + ',' + params.custscript_sfv_recordid + ',' + params.custscript_sfv_field + ',' + params.custscript_sfv_value + ')');
		nlapiSubmitField(params.custscript_sfv_recordtype,params.custscript_sfv_recordid,params.custscript_sfv_field,params.custscript_sfv_value);
	}
}

//============================================================//
// function: getInparams
// Comments: Helper function for retrieveing all actionscript
// parameters
//	inparams:
//	context
// Returnvalue: {Object}
//============================================================//
function getInparams(context,inparams){
	var arr = isArray(inparams) ? inparams:[inparams];
	var obj = new Object();
	for(var i = 0; i < arr.length; i++){
		obj[arr[i]] = context.getSetting('SCRIPT',arr[i]);
//		nlapiLogExecution('Debug', 'inParams', arr[i] + ':' + obj[arr[i]]);
	}
	return obj;
}

// *** DEBUG ***
if (nlapiGetContext().getExecutionContext() == 'debugger') {
	var params = {
		custscript_sfv_recordtype:'contact',
		custscript_sfv_recordid:1353340,
		custscript_sfv_field:'custentity_last_activity_creation_date',
		custscript_sfv_value:'2020-9-1'
	};
	var res = SetFieldValueInternal(params);
	var d = 3;
}
