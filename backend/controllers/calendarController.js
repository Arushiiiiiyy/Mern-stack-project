import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

/**
 * Format a JS Date to ICS datetime in Asia/Kolkata timezone
 */
const formatDateIST = (d) => {
  const date = new Date(d);
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + istOffset);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  const h = String(ist.getUTCHours()).padStart(2, '0');
  const min = String(ist.getUTCMinutes()).padStart(2, '0');
  const s = String(ist.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}`;
};

const VTIMEZONE = `BEGIN:VTIMEZONE
TZID:Asia/Kolkata
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0530
TZOFFSETTO:+0530
TZNAME:IST
END:STANDARD
END:VTIMEZONE`;

/**
 * Generate ICS content for an event with proper IST timezone
 */
const generateICS = (event) => {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Felicity EMS//EN
${VTIMEZONE}
BEGIN:VEVENT
DTSTART;TZID=Asia/Kolkata:${formatDateIST(event.startDate)}
DTEND;TZID=Asia/Kolkata:${formatDateIST(event.endDate)}
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

    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Felicity EMS//EN\n${VTIMEZONE}\n`;

    for (const reg of registrations) {
      if (!reg.event) continue;
      const ev = reg.event;

      icsContent += `BEGIN:VEVENT
DTSTART;TZID=Asia/Kolkata:${formatDateIST(ev.startDate)}
DTEND;TZID=Asia/Kolkata:${formatDateIST(ev.endDate)}
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

/**
 * @desc    Get Outlook Calendar link for an event
 * @route   GET /api/calendar/:eventId/outlook
 */
export const getOutlookCalendarLink = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const formatOutlookDate = (d) => new Date(d).toISOString();
    const url = `https://outlook.live.com/calendar/0/action/compose?subject=${encodeURIComponent(event.name)}&startdt=${formatOutlookDate(event.startDate)}&enddt=${formatOutlookDate(event.endDate)}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.venue || '')}`;

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
