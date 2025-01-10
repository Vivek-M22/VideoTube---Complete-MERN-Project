class ApiResponse {
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }



/*
The ApiResponse class is used to standardize successful API responses.

Purpose:
- Represents successful API responses with a consistent structure.

Properties:
- statusCode: The HTTP status code of the response.
- data: The payload or data returned by the API.
- message: A message accompanying the response, defaulting to "Success".
- success: A boolean indicating whether the response is successful (status code < 400).

Usage:
- Use ApiResponse when returning successful responses from an API endpoint.
- Provides a consistent structure for successful responses, aiding client-side parsing and understanding.

In summary, ApiResponse is for successful responses, ensuring a uniform response format across the application.
*/