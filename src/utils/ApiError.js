class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export {ApiError}



/*
Comparison of ApiResponse and ApiError Classes:

ApiResponse:
- Purpose: Standardizes successful API responses.
- Properties:
  - statusCode: HTTP status code of the response.
  - data: Payload or data returned by the API.
  - message: Accompanying message, defaults to "Success".
  - success: Boolean indicating success (status code < 400).
- Usage: Use for successful API responses to ensure consistent structure.

ApiError:
- Purpose: Represents error responses in an API.
- Properties:
  - statusCode: HTTP status code indicating error type.
  - message: Description of the error.
  - errors: Array of specific error details.
  - stack: Stack trace for debugging.
  - success: Boolean indicating failure (always false).
- Usage: Use for error handling and returning error responses with detailed information.
- To provide detailed error information, including status code, error messages,
  and stack trace, which can be useful for debugging and client-side error handling.
  
Summary:
- ApiResponse is for successful responses, providing a uniform format.
- ApiError is for error handling, offering detailed error information.
*/