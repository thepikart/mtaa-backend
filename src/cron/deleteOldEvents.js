const cron = require('node-cron');
const db = require('../database/models');

cron.schedule('0 0 * * *', async () => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const eventsToDelete = await db.Event.findAll({
            where: {
                date: {
                    [db.Sequelize.Op.lt]: today
                }
            }
        });

        console.log('Events to delete:', eventsToDelete);

        const eventIds = eventsToDelete.map(event => event.id);
        if (eventIds.length === 0) {
            console.log('No old events to delete');
            return;
        }

        await db.UserEvent.destroy({ where: { event_id: eventIds } });
        await db.Comment.destroy({ where: { event_id: eventIds } });
        await db.Event.destroy({ where: { id: eventIds } });

    }
    catch (error) {
        console.error('Error deleting old events:', error);
    }
});