import connectDB from "./config/dbConnect.js";
import constants from "./config/constant.js";
import app from "./app.js";

connectDB();

app.listen(constants.PORT, () => {
    console.log(`Server is running on port ${constants.PORT}`);
});

