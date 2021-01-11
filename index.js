var aws = require('aws-sdk');
var nodemailer = require('nodemailer');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var ses = new aws.SES({ region: 'us-west-2' });
var s3 = new aws.S3();

function getS3File(bucket, key) {
    return new Promise(function (resolve, reject) {
        s3.getObject(
            {
                Bucket: bucket,
                Key: key
            },
            function (err, data) {
                if (err) return reject(err);
                else return resolve(data);
            }
        );
    })
}

exports.handler = function (event, context, callback) {

    console.log("Incoming: ", event);
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };

    s3.getObject({
        Bucket: bucket,
        Key: key
    }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            callback(err);
        } else {
            const contents = data.Body.toString();
            const dom = new JSDOM(contents);
            const selector = '#pills-summary > div > div > div:nth-child(3) > div:nth-child(3) > div > div > h1';
            const selectedData = dom.window.document.querySelector(selector).textContent;
            console.log("The following value was selected: ", selectedData);
            const numberOfFailures = parseInt(selectedData, 10);
            console.log(numberOfFailures);
            if (numberOfFailures > 0) {
                console.log("The report had failures!");
                var result = "FAILED";
               getS3File(bucket, key)
               .then(function (fileData) {
                   var subject_value = 'Health check - ' + result;
                   console.log(subject_value);
                   var mailOptions = {
                       from: 'donotreply-notify@gmail.com',
                       subject: subject_value,
                       html: '<p>Dear Team,</p><p>Please find the attached email for the API automation result. For best view please download and view the html file.</p><p>Below link contains complete list of html reports upto date</p><a href="https://s3.console.aws.amazon.com/s3/buckets/api-automation-reports/postman/automationTest/newman/?region=us-east-1&tab=overview">Automation results - S3 bucket</a><p>Regards,</p><p>Sravan</p>',
                       to: ['sravankumarreddy.bade@gmail.com'],
                       // bcc: Any BCC address you want here in an array,
                       attachments: [
                           {
                               filename: "API-Automation-Report.html",
                               content: fileData.Body
                           }
                       ]
                   };
                   console.log('Creating SES transporter');
                   // create Nodemailer SES transporter
                   var transporter = nodemailer.createTransport({
                       SES: ses
                   });
       
                   // send email
                   transporter.sendMail(mailOptions, function (err, info) {
                       if (err) {
                           console.log(err);
                           console.log('Error sending email');
                           callback(err);
                       } else {
                           console.log('Email sent successfully');
                           callback();
                       }
                   });
               })
               .catch(function (error) {
                   console.log(error);
                   console.log('Error getting attachment from S3');
                   callback(error);
               });
            } else {
                console.log("The report was successful!");
                var result = "SUCCEEDED";
                getS3File(bucket, key)
                .then(function (fileData) {
                    var subject_value = 'Health Check - ' + result;
                    console.log(subject_value);
                    var mailOptions = {
                        from: 'donotreply-notify@gmail.com',
                        to: ['sravankumarreddy.bade@gmail.com'],
                        subject: subject_value,
                        html: '<p>Dear Team,</p><p>Please find the attached email for the API automation result. For best view please download and view the html file.</p><p>Below link contains complete list of html reports upto date</p><a href="https://s3.console.aws.amazon.com/s3/buckets/api-automation-reports/postman/automationTest/newman/?region=us-east-1&tab=overview">Automation results - S3 bucket</a><p>Regards,</p><p>Sravan</p>',
                        // bcc: Any BCC address you want here in an array,
                        attachments: [
                            {
                                filename: "API-Automation-Report.html",
                                content: fileData.Body
                            }
                        ]
                    };
                    console.log('Creating SES transporter');
                    // create Nodemailer SES transporter
                    var transporter = nodemailer.createTransport({
                        SES: ses
                    });
        
                    // send email
                    transporter.sendMail(mailOptions, function (err, info) {
                        if (err) {
                            console.log(err);
                            console.log('Error sending email');
                            callback(err);
                        } else {
                            console.log('Email sent successfully');
                            callback();
                        }
                    });
                })
                .catch(function (error) {
                    console.log(error);
                    console.log('Error getting attachment from S3');
                    callback(error);
                });
            }

        }
    });
    
};
