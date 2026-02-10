import jwt from 'jsonwebtoken';

export const createAccessToken = (signature) => {
  try {
    const currentDate = new Date();
    currentDate.setTime(
      currentDate.getTime() - new Date().getTimezoneOffset() * 60 * 1000
    );
    // const expiresIn = 10 * 60; // 10 minutes
    const expiresIn = 60 * 60; // 1 hour in seconds
    const expiresAt = new Date(currentDate.getTime() + expiresIn * 1000);
    // convert to seconds
    const token = jwt.sign(signature, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn
    });

    return {
      token,
      expiresIn,
      expiresAt
    };
  } catch (error) {
    console.error(error);
    return;
  }
};
