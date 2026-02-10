import { Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { ValidationHelper } from '../helpers/validation.helper';
import { createAccessToken } from '../helpers/createAccessToken.utils';
import { usersRepository } from '../repositories/users.repository';
import { otpRepository } from '../repositories/otp.repository';
import { tokenRepository } from '../repositories/token.repository';
import { otpService } from '../services/otp.service';
import { createErrorResponse, createSuccessResponse } from '../helpers/response.utils';

export const loginUser = async (req: Request, res: Response) => {
  const validation = ValidationHelper.validateObject(req.body, Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }));

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { email, password } = req.body;

  const userResult = await usersRepository.findUserByEmail(email);
  if (userResult.err) {
    res.status(500).json(createErrorResponse(userResult.err.message || 'An error occurred while retrieving user.', userResult.err));
    return;
  }

  const user = userResult.value;
  if (!user) {
    res.status(404).json(createErrorResponse('User not found.'));
    return;
  }

  if (!user.isVerified) {
    // Check if OTP is still valid
    const otpRecordResult = await otpRepository.findOtpByEmail(email);
    if (otpRecordResult.err) {
      res.status(500).json(createErrorResponse(otpRecordResult.err.message || 'An error occurred while retrieving OTP.', otpRecordResult.err));
      return;
    }

    const otpRecord = otpRecordResult.value;
    let code;
    let expiresAt;
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      // Generate new OTP if the previous one has expired
      const generateOtpResult = await otpService.generateOtp(email);
      if (generateOtpResult.err) {
        res.status(500).json(createErrorResponse(generateOtpResult.err.message || 'An error occurred while generating OTP.', generateOtpResult.err));
        return;
      }
      const otpResult = generateOtpResult.value!;

      // Save new OTP to database
      const otpRecord = {
        email: email,
        otp: otpResult.otp,
        expiresAt: otpResult.expiresAt,
      };
      const saveOtpResult = await otpRepository.saveOtp(otpRecord);
      if (saveOtpResult.err) {
        res.status(500).json(createErrorResponse(saveOtpResult.err.message || 'An error occurred while saving OTP.', saveOtpResult.err));
        return;
      }

      // Send new OTP via email here (Email service integration needed)
      code = otpResult.otp;
      expiresAt = otpResult.expiresAt;
      // sendEmail(email, 'Your OTP Code', `Your OTP code is ${emailPayload.otp} and it expires at ${emailPayload.expiresAt}`);
    } else {
      code = otpRecord.otp;
      expiresAt = otpRecord.expiresAt;
    }
    res.status(403).json(createErrorResponse('Email not verified. Please verify your email before logging in.', {
      otp: code,
      expiresAt
    } ));
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.status(401).json(createErrorResponse('Invalid credentials.'));
    return;
  }

  const signature = {
    userId: user._id,
    email: user.email,
    profile: user.profile,
  };
  const tokenResult = createAccessToken(signature)!;

  const existingTokenResult = await tokenRepository.findByUserId(user._id.toString());
  if (existingTokenResult.err) {
    res.status(500).json(createErrorResponse(existingTokenResult.err.message || 'An error occurred while checking for existing token.', existingTokenResult.err));
    return;
  }

  if (existingTokenResult.value) {
    await tokenRepository.updateToken(existingTokenResult.value._id.toString(), { token: tokenResult.token, expiresAt: tokenResult.expiresAt });
  }

  res.status(200).json(createSuccessResponse({
    token: tokenResult.token,
    userId: user._id,
    email: user.email
  }, 'Login successful.'));
}

export const registerUser = async (req: Request, res: Response) => {
  const validation = ValidationHelper.validateObject(req.body, Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    profile: Joi.string().valid('business_owner', 'investor'),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    // confirm_password: Joi.string().valid(Joi.ref('password')).required(),
  }));

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { email } = req.body;

  // Confirm if email already exists in the database
  const existingUserResult = await usersRepository.findUserByEmail(email);
  if (existingUserResult.err) {
    res.status(500).json(createErrorResponse(existingUserResult.err.message || 'An error occurred while checking for existing user.', existingUserResult.err));
    return;
  }

  if (existingUserResult.value) {
    res.status(409).json(createErrorResponse('Email already in use.'));
    return;
  }

  // Create new user
  const userData = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    profile: req.body.profile,
    email: email,
    password: req.body.password,
  };
  const newUserResult = await usersRepository.createUser(userData);
  if (newUserResult.err) {
    res.status(500).json(createErrorResponse(newUserResult.err.message || 'An error occurred while creating the user.', newUserResult.err));
    return;
  }

  // Create OTP and send verification email
  const generateOtpResult = await otpService.generateOtp(email);
  if (generateOtpResult.err) {
    res.status(500).json(createErrorResponse(generateOtpResult.err.message || 'An error occurred while generating OTP.', generateOtpResult.err));
    return;
  }
  const otpResult = generateOtpResult.value!;

  // Save OTP to database
  const otpRecord = {
    email: email,
    otp: otpResult.otp,
    expiresAt: otpResult.expiresAt,
  };
  const saveOtpResult = await otpRepository.saveOtp(otpRecord);
  if (saveOtpResult.err) {
    res.status(500).json(createErrorResponse(saveOtpResult.err.message || 'An error occurred while saving OTP.', saveOtpResult.err));
    return;
  }

  // Send otp via email here (Email service integration needed)
  
  res.status(201).json(createSuccessResponse({
    userId: newUserResult.value!._id,
    otp: otpResult.otp
  }, 'User registered successfully. Verify email.'));
};

export const resendOtp = async (req: Request, res: Response) => {
  const validation = ValidationHelper.validateObject(req.body, Joi.object({
    email: Joi.string().email().required(),
  }));

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { email } = req.body;

  // Check if user exists and is not verified
  const userResult = await usersRepository.findUserByEmail(email);
  if (userResult.err) {
    res.status(500).json(createErrorResponse(userResult.err.message || 'An error occurred while retrieving user.', userResult.err));
    return;
  }

  const user = userResult.value;
  if (!user) {
    res.status(404).json(createErrorResponse('User not found.'));
    return;
  }

  if (user.isVerified) {
    res.status(400).json(createErrorResponse('Email is already verified.'));
    return;
  }

  // Generate new OTP and save to database
  const generateOtpResult = await otpService.generateOtp(email);
  if (generateOtpResult.err) {
    res.status(500).json(createErrorResponse(generateOtpResult.err.message || 'An error occurred while generating OTP.', generateOtpResult.err));
    return;
  }
  const otpResult = generateOtpResult.value!;

  const otpRecord = {
    email: email,
    otp: otpResult.otp,
    expiresAt: otpResult.expiresAt,
  };
  const saveOtpResult = await otpRepository.saveOtp(otpRecord);
  if (saveOtpResult.err) {
    res.status(500).json(createErrorResponse(saveOtpResult.err.message || 'An error occurred while saving OTP.', saveOtpResult.err));
    return;
  }

  // Send new OTP via email here (Email service integration needed)

  res.status(200).json(createSuccessResponse({
    email: user.email,
    otp: otpResult.otp,
    expiresAt: otpResult.expiresAt
  }, 'OTP resent successfully.'));
}

export const verifyOtp = async (req: Request, res: Response) => {
  const validation = ValidationHelper.validateObject(req.body, Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
  }));

  if (validation.err) {
    res.status(400).json(createErrorResponse(validation.err.message, validation.err));
    return;
  }

  const { email, otp } = req.body;

  const otpRecordResult = await otpRepository.findOtpByEmail(email);
  if (otpRecordResult.err) {
    res.status(500).json(createErrorResponse(otpRecordResult.err.message || 'An error occurred while retrieving OTP.', otpRecordResult.err));
    return;
  }

  const otpRecord = otpRecordResult.value;
  if (!otpRecord || otpRecord.otp !== otp) {
    res.status(400).json(createErrorResponse('Invalid OTP.'));
    return;
  }

  if (otpRecord.expiresAt < new Date()) {
    res.status(400).json(createErrorResponse('OTP has expired.'));
    return;
  }

  // Mark user as verified
  const userResult = await usersRepository.findUserByEmail(email);
  if (userResult.err || !userResult.value) {
    res.status(500).json(createErrorResponse('An error occurred while verifying user.', userResult.err));
    return;
  }

  const user = userResult.value;
  user.isVerified = true;
  const updateUserResult = await usersRepository.updateUser(email, user);
  if (updateUserResult.err) {
    res.status(500).json(createErrorResponse(updateUserResult.err.message || 'An error occurred while updating user verification status.', updateUserResult.err));
    return;
  }

  // Delete OTP after successful verification
  await otpRepository.deleteOtp(email);

  res.status(200).json(createSuccessResponse({
    userId: user._id,
    email: user.email
  }, 'Email verified successfully.'));

};