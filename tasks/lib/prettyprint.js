'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var colorState = {
    pending: 'blue',
    running: 'green',
    stopping: 'yellow',
    stopped: 'magenta',
    'shutting-down': 'yellow',
    terminated: 'red'
};

module.exports = {
    instance: function (instance) {
        console.log('%s %s %s (%s) [%s] on %s',
            chalk.magenta(instance.InstanceId),
            chalk.magenta(instance.ImageId),
            chalk.magenta(_.pluck(instance.Tags, 'Value')),
            chalk[colorState[instance.State.Name]](instance.State.Name),
            chalk.cyan(instance.KeyName),
            chalk.underline(instance.PublicIpAddress)
        );
    }
};
