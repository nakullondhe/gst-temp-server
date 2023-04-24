// const logger = require('@logger');
// const config = require('@config');
const AWS = require('aws-sdk');
// const sgMail = require('@sendgrid/mail');
const transformMailData = require('./transformMailData');

const SES_CONFIG = {
  accessKeyId: process.env.SNS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
  region: 'ap-south-1',
};

const AWS_SES = new AWS.SES(SES_CONFIG);

const sendEmail = ({ templateName, data, to, subject }) => {
  const params = {
    Source: '3Not3 <info@3not3.com>',
    Destination: {
      ToAddresses: [to],
    },
    ReplyToAddresses: [],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: transformMailData({ templateName, data }),
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
  };
  return AWS_SES.sendEmail(params).promise();
};

// let sendTemplateEmail = (recipientEmail) => {
//     let params = {
//       Source: '<email address you verified>',
//       Template: '<name of your template>',
//       Destination: {
//         ToAddresse': [
//           recipientEmail
//         ]
//       },
//       TemplateData: '{ \"name\':\'John Doe\'}'
//     };
//     return AWS_SES.sendTemplatedEmail(params).promise();
// };

// module.exports = {
//   sendEmail,
//   sendTemplateEmail,
// };

// sgMail.setApiKey(config.sendgrid_api_key);

// const sendMail = (options) => {
//   const mailOptions = {
//     from: 'info@3not3.com',
//     to: options.to,
//     subject: options.subject,
//     text: 'test kiya bhai',
//     html: options.html,
//   };
//   sgMail
//     .send(mailOptions)
//     .then(() => logger.info('Mail sent successfully'))
//     .catch((err) => logger.error(err));
// };

// sendMail({
//   to: 'nakul.londhe@gmail.com',
//   subject: 'Join a Team',
//   templateId: inviteToTeam.templateId,
//   personalizations: inviteToTeam.personalizations,
// });

module.exports = sendEmail;
