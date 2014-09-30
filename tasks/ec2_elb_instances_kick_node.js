'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var util = require('util');
var conf  = require('./lib/conf.js');
var aws = require('./lib/aws.js');
var Connection = require('ssh2');
var async = require('async');

module.exports = function (grunt) {

    var taskName = 'ec2-elb-instances-kick-node';

    grunt.registerTask(taskName, 'Kick Node on servers attached to an AWS ELB load balancer', function (elbs) {
        conf.init(grunt);

        var done = this.async();
        var balancer = elbs || conf('AWS_ELB_NAME');
        if (balancer === void 0) {
            grunt.fatal([
                'You should set the ELB name as option AWS_ELB_NAME, or pass it into the task.',
                'e.g: ' + chalk.yellow(util.format('grunt %s:elb-name', taskName))
            ].join('\n'));
        }

        grunt.log.writeln('Kicking Node on EC2 instances attached to AWS ELB(s) %s ...', chalk.cyan(elbs));

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

                        async.forEach(hosts, function(host, cb) {
                            var c = new Connection();

                            c.on('connect', function() {
                                console.log('Connection :: connect');
                            });
                            c.on('ready', function() {
                                console.log('Connection :: ready');
                                c.exec('sudo service angular-node-daemon reload', function(err, stream) {
                                    if (err) throw err;
                                    stream.on('data', function(data, extended) {
                                        console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
                                                  + data);
                                    });
                                    stream.on('end', function() {
                                        console.log('Stream :: EOF');
                                    });
                                    stream.on('close', function() {
                                        console.log('Stream :: close');
                                    });
                                    stream.on('exit', function(code, signal) {
                                        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
                                        c.end();
                                    });
                                });
                            });
                            c.on('error', function(err) {
                                console.log('Connection :: error :: ' + err);
                                cb();
                            });
                            c.on('end', function() {
                                console.log('Connection :: end');
                                cb();
                            });

                            c.connect({
                                host: host,
                                port: 22,
                                username: conf('AWS_SSH_USER'),
                                privateKey: require('fs').readFileSync(conf('SSH_PRIVATE_KEY')),
                                passphrase: conf('SSH_PASSPHRASE_KEY')
                            });
                        }, function(error) {
                          done(!error);
                        });

                    }
                });

            }
        });
    });
};
