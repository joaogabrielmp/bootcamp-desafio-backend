import { Op } from 'sequelize';

import Subscription from '../models/Subscription';
import Meetup from '../models/Meetup';
import User from '../models/User';

import Queue from '../../lib/Queue';
import SubscriptionMail from '../jobs/SubscriptionMail';

class SubscriptionController {
  async index(req, res) {
    try {
      const subscriptions = await Subscription.findAll({
        where: {
          user_id: req.userId,
        },
        include: [
          {
            model: Meetup,
            required: true,
            where: {
              date: { [Op.gt]: new Date() },
            },
          },
        ],
        order: [[Meetup, 'date']],
      });

      return res.json(subscriptions);
    } catch (error) {
      return res
        .status(400)
        .json({ error: 'An unexpected error has occurred. Try again' });
    }
  }

  async store(req, res) {
    try {
      const user = await User.findByPk(req.userId);
      const { meetup_id } = req.params;

      const meetup = await Meetup.findByPk(meetup_id);

      if (!meetup) {
        return res.status(400).json({ error: 'Meetup not found' });
      }

      if (meetup.user_id === req.userId) {
        return res
          .status(400)
          .json({ error: 'User must not be meetup organizer' });
      }

      if (meetup.past) {
        return res.status(400).json({ error: 'Meetup already ended.' });
      }

      const subscription = await Subscription.findOne({ where: { meetup_id } });

      if (subscription && subscription.user_id === req.userId) {
        return res.status(400).json({ error: 'User already subscribed' });
      }

      const sameDate = await Subscription.findOne({
        where: {
          user_id: req.userId,
        },
        include: [
          {
            model: Meetup,
            required: true,
            where: {
              date: meetup.date,
            },
          },
        ],
      });

      if (sameDate) {
        return res.status(400).json({
          error: 'User cannot subscribe to two meetups with the same date.',
        });
      }

      const { id, user_id } = await Subscription.create({
        meetup_id,
        user_id: req.userId,
      });

      await Queue.add(SubscriptionMail.key, {
        meetup,
        user,
      });

      return res.json({ id, meetup_id, user_id });
    } catch (error) {
      return res
        .status(400)
        .json({ error: 'An unexpected error has occurred. Try again' });
    }
  }
}

export default new SubscriptionController();
