const db = require('../database/models');

exports.getUser = async (req, res) => {
    const { id } = req.params;

    const user = await db.User.findByPk(id, { include: [db.Event] });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const createdEvents = await db.Event.findAll({ where: { creator_id: id } });

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name + ' ' + user.surname,
            username: user.username,
            bio: user.bio,
            photo: user.photo,
        },
        createdEvents: createdEvents.map(event => ({
            id: event.id,
            title: event.title,
            place: event.place,
            date: event.date,
            description: event.description,
        })),
        goingToEvents: user.Events.map(event => ({
            id: event.id,
            title: event.title,
            place: event.place,
            date: event.date,
            description: event.description,
        }))
    });
}