const Command = require('../command');
const Models = require('../../../models');

/**
 * Handles data location response.
 */
class DvPurchaseInitiateCommand extends Command {
    constructor(ctx) {
        super(ctx);
        this.logger = ctx.logger;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     * @param transaction
     */
    async execute(command, transaction) {
        const {
            handler_id, status, message, encodedData,
        } = command.data;

        if (status === 'SUCCESSFUL') {
            // todo send bc command

            const commandData = {
                handler_id,
                encodedData,
            };

            await this.commandExecutor.add({
                name: 'dvPurchaseKeyDepositedCommand',
                delay: 5 * 60 * 1000, // 5 min
                data: commandData,
                transactional: false,
            });
        } else {
            // todo should we add message if status is failed for data_trades
            this.logger.trace(`Unable to initiate purchase dh returned status: ${status} with message: ${message}`);
            const handler = await Models.handler_ids.findOne({
                where: {
                    handler_id,
                },
            });

            const { data_set_id, seller_node_id, ot_object_id } = JSON.parse(handler.data);

            await Models.data_trades.update({
                status,
            }, {
                where: {
                    data_set_id,
                    seller_node_id,
                    ot_json_object_id: ot_object_id,
                },
            });

            await Models.handler_ids.update({
                status: 'FAILED',
            }, { where: { handler_id } });

            return Command.empty();
        }
    }

    /**
     * Builds default DvPurchaseInitiateCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'dvPurchaseInitiateCommand',
            delay: 0,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = DvPurchaseInitiateCommand;