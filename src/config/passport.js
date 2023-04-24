const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const passport = require('passport');
const config = require('./config');
const User = require('../../models/user.schema');

// const GOOGLE_CALLBACK_URL =
//   config.env === 'production'
//     ? 'http://localhost:5000/api/auth/google/callback'
//     : 'http://localhost:5000/api/auth/google/callback';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => done(null, user));
});

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // algorithms: ['HS256'],
};

const jwtVerify = async (payload, done) => {
  try {
    // if (payload.type !== tokenTypes.ACCESS) {
    //   throw new Error('Invalid token type');
    // }
    const user = await User.findById(payload.id);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const googleVerify = async (req, accessToken, refreshToken, profile, done) => {
  try {
    const user = await User.findOne({ googleId: profile.id });
    if (user) {
      return done(null, user);
    }
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      username: profile.emails[0].value,
      fullName: profile.displayName,
      profileImage: profile.photos[0].value,
    });
    await newUser.save();
    done(null, newUser);
  } catch (error) {
    done(error, false);
  }
};

const facebookVerify = async (accessToken, refreshToken, profile, next) => {
  try {
    const email = profile.emails[0].value;
    const user = await User.findOne({ email });
    if (user) {
      return next(null, user);
    }
    const newUser = new User({
      facebookId: profile.id,
      email: profile.emails[0].value,
      username: profile.emails[0].value,
      fullName: profile.displayName,
      profileImage: profile.photos[0].value,
    });
    await newUser.save();
    next(null, newUser);
  } catch (error) {
    next(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
const googleStrategy = passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      scope: ['profile', 'email'],
      callbackURL: 'http://localhost:5000/api/auth/google/redirect',
      // passReqToCallback: true,
    },
    googleVerify
  )
);
const facebookStrategy = passport.use(
  new FacebookStrategy(
    {
      clientID: config.facebook.appID,
      clientSecret: config.facebook.appSecret,
    },
    facebookVerify
  )
);

module.exports = {
  jwtStrategy,
  googleStrategy,
  facebookStrategy,
};
