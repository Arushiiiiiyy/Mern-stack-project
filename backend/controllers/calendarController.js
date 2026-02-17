import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

/**
 * Generate ICS content for an event
 */
const generateICS = (event) => {
  const formatDate = (d) => {
    const date = new Date(d);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Felicity EMS//EN
BEGIN:VEVENT
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${event.name}
DESCRIPTION:${event.description?.replace(/\n/g, '\\n') || ''}
LOCATION:${event.venue || ''}
STATUS:CONFIRMED
UID:${event._id}@felicity-ems
END:VEVENT
END:VCALENDAR`;
};

/**
 * @desc    Download ICS file for a single event
 * @route   GET /api/calendar/:eventId
 */
export const getEventICS = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const ics = generateICS(event);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${event.name.replace(/\s+/g, '_')}.ics`);
    res.send(ics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Batch export ICS for all registered events
 * @route   GET /api/calendar/batch
 */
export const getBatchICS = async (req, res) => {
  try {
    const registrations = await Registration.find({
      participant: req.user._id,
      statuses: 'Confirmed'
    }).populate('event');

    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Felicity EMS//EN\n`;

    for (const reg of registrations) {
      if (!reg.event) continue;
      const ev = reg.event;
      const formatDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      icsContent += `BEGIN:VEVENT
DTSTART:${formatDate(ev.startDate)}
DTEND:${formatDate(ev.endDate)}
SUMMARY:${ev.name}
DESCRIPTION:${ev.description?.replace(/\n/g, '\\n') || ''}
LOCATION:${ev.venue || ''}
UID:${ev._id}@felicity-ems
END:VEVENT\n`;
    }

    icsContent += `END:VCALENDAR`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=felicity-events.ics');
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get Google Calendar link for an event
 * @route   GET /api/calendar/:eventId/google
 */
export const getGoogleCalendarLink = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const formatDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${formatDate(event.startDate)}/${formatDate(event.endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.venue || '')}`;

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
