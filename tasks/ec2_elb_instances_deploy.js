'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var util = require('util');
var conf  = require('./lib/conf.js');
var aws = require('./lib/aws.js');
var scp = require('scp');

module.exports = function (grunt) {

    var taskName = 'ec2-elb-instances-deploy';

    grunt.registerTask(taskName, 'Deploy specified files to all the instances attached to an AWS ELB load balancer', function (elbs, files, override) {
        conf.init(grunt);

        if(grunt.config.get('confirmDeploy') || override ) {
            var done = this.async();
            var balancer = elbs || conf('AWS_ELB_NAME');
            if (balancer === void 0) {
                grunt.fatal([
                    'You should set the ELB name as option AWS_ELB_NAME, or pass it into the task.',
                    'e.g: ' + chalk.yellow(util.format('grunt %s:elb-name:files?', taskName))
                ].join('\n'));
            }

            grunt.log.writeln('Deploying to EC2 instances attached to AWS ELB(s) %s ...', chalk.cyan(elbs));

            var params = {
                LoadBalancerNames: elbs.split()
            };

            aws.elb.describeLoadBalancers(params, function(err, data) {
                if (err) {
                    grunt.log.error('Failed with error: %s.',  chalk.red(err.message));
                } else {
                    var instances = _.pluck(data.LoadBalancerDescriptions, 'Instances');
                    var instanceIds = _.pluck(_.flatten(instances), 'InstanceId');

                    var instancesParams = {
                        InstanceIds: instanceIds
                    };

                    aws.ec2.describeInstances(instancesParams, function(err, data) {
                        if (err){
                            grunt.log.error('Failed with error: %s.',  chalk.red(err.message));
                        } else {
                            var instances = _.pluck(data.Reservations, 'Instances');
                            var flatInstances = _.flatten(instances);

                            var hosts = _.pluck(flatInstances, 'PublicDnsName');

                            var callback = function (err) {
                                if (err) {
                                    grunt.log.error('Failed with error: %s.',  chalk.red(err.message));
                                } else {
                                    grunt.log.ok('File(s) %s transferred to %s.', chalk.cyan(options.file), chalk.magenta(options.host));
                                }
                                done();
                            };

                            for(var i in hosts){
                                var options = {
                                    file: files.split(',').join(' '),
                                    user: conf('AWS_SSH_USER'),
                                    host: hosts[i],
                                    port: '22',
                                    path: conf('AWS_DEPLOY_PATH'),
                                };

                                scp.send(options, callback);
                            }

                        }
                    });

                }
            });
        } else {
            grunt.log.error('Deploy aborted.');
        }

    });
};
