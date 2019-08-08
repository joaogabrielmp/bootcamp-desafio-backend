import * as Yup from 'yup';
import { isBefore, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';

class MeetupController {
  async index(req, res) {
    const user_id = req.userId;

    const meetups = await Meetup.findAll({ where: { user_id } });

    if (!meetups) {
      return res.status(400).json({ error: 'Meetup not found' });
    }

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { date } = req.body;

    if (isBefore(parseISO(date), new Date())) {
      return res.status(400).json({
        error: 'Meetup date must be equal to or greater current date',
      });
    }

    const user_id = req.userId;

    const { id, title, description, location } = await Meetup.create({
      ...req.body,
      user_id,
    });

    return res.json({ id, title, description, location, date, user_id });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      banner_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { id } = req.params;
    const { date } = req.body;

    const meetup = await Meetup.findByPk(id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found' });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(400).json({ error: 'User must be meetup organizer' });
    }

    if (isBefore(parseISO(date), new Date())) {
      return res.status(400).json({
        error: 'Meetup date must be equal to or greater current date',
      });
    }

    if (meetup.past) {
      return res.status(400).json({ error: 'Meetup already ended.' });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const { id } = req.params;

    const meetup = await Meetup.findByPk(id);

    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found' });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(400).json({ error: 'User must be meetup organizer' });
    }

    if (meetup.past) {
      return res.status(400).json({ error: 'Meetup already ended.' });
    }

    await meetup.destroy();

    return res.json({ message: 'Meetup canceled' });
  }
}

export default new MeetupController();
