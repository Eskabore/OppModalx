global class VisualforceException extends Exception {
	global VisualforceException(String param0, Exception param1) { }
	global VisualforceException(Exception param0) { }
	global VisualforceException(String param0) { }
	global VisualforceException() { }
	global Exception getCause() { }
	global Map<String,Set<String>> getInaccessibleFields() { }
	global Integer getLineNumber() { }
	global String getMessage() { }
	global String getStackTraceString() { }
	global String getTypeName() { }
	global void initCause(Exception cause) { }
	global void setMessage(String message) { }

}