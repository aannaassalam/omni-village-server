// type tryCatchController = (req: Request, res: Response) => any;

const ControllerWrapper = (controller) => async (req, res, next) => {
  try {
    await controller(req, res);
  } catch (error) {
    // console.log(error);
    return next(error);
  }
};

module.exports = ControllerWrapper;
