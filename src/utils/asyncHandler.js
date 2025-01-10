

const asyncHandler = (requestHandler) => {
    return (req , res , next) => {
        Promise.resolve(requestHandler(req ,res, next)).catch((err) => next(err))
    }
}

export {asyncHandler}


// const asyncHandler = () => {}
// const asyncHandler = (func) => { () => {} }
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}


// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }

/*
The `asyncHandler.js` file defines a utility function, `asyncHandler`, 
which simplifies error handling in asynchronous Express route handlers.
 Here's a concise explanation:

- **Functionality**: `asyncHandler` takes an asynchronous function (`requestHandler`) and 
returns a new function that automatically catches any errors and passes them to the next middleware using `next(err)`. 
This eliminates the need for repetitive try-catch blocks in each route handler.

- **Importance**:
  - **Cleaner Code**: It abstracts error handling, making route handlers more readable and maintainable.
  - **Consistent Error Handling**: Ensures that all errors are handled uniformly across the application.
  - **Middleware Integration**: Works seamlessly with Express's middleware pattern, allowing centralized error management.

In summary, `asyncHandler` is crucial for maintaining clean, efficient, and consistent error handling in Express applications.

*/