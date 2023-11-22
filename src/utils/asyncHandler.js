// this is a wrapper which utilized for connection with DB

// -------- 2nd approach , with prmises handler, high order funciton ----

const asyncHandler = async (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

// --- one approach , try catch based approach---
// write an high order functions (function which get the function as a parameter)
// req,res and next coming from the func which we pass , next deal with middleware

// const asyncHandler = (requestHandler) => async (req, res, next) => {
//   try {
//     // now we will execute the functon which we take
//     await requestHandler(req, res, next);
//   } catch (error) {
//     // if user send the code than show it
//     res.status(error.code || 500).json({
//       // json provide success flag
//       success: flase,
//       message: error.message,
//     });
//   }
// };

export { asyncHandler };
