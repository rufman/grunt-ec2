'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var util = require('util');
var conf  = require('./lib/conf.js');
var aws = require('./lib/aws.js');
var prettyprint = require('./lib/prettyprint.js');

module.exports = function (grunt) {

    var taskName = 'ec2-elb-instances-list';

    grunt.registerTask(taskName, 'Lists all the instances attached to an AWS ELB load balancer', function (elbs) {
        conf.init(grunt);

        var done = this.async();
        var balancer = elbs || conf('AWS_ELB_NAME');
        if (balancer === void 0) {
            grunt.fatal([
                'You should set the ELB name as option AWS_ELB_NAME, or pass it into the task.',
                'e.g: ' + chalk.yellow(util.format('grunt %s:elb-name?', taskName))
            ].join('\n'));
        }

        grunt.log.writeln('Getting EC2 instances attached to AWS ELB(s) %s ...', chalk.cyan(elbs));

        var params = {
            LoadBalancerNames: elbs.split(',')
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

                        _.each(flatInstances, prettyprint.instance);

                        done();

                    }
                });

            }
        });

    });
};
