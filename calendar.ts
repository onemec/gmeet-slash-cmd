import { google } from 'googleapis'
import { v7 as uuidv7 } from 'uuid'
import { createOAuthClient } from './auth'
import { AuthUser } from './types'

/**
 * Creates a Google Calendar event for the authenticated user.
 *
 * @param {AuthUser} user - The authenticated user object containing OAuth tokens.
 * @returns {Promise<string>} - A promise that resolves to the Hangout link of the created event.
 */
export const createEvent = async (user: AuthUser): Promise<string> => {
  const client = createOAuthClient(user.tokens)
  const calendar = google.calendar({ version: 'v3', auth: client })
  try {
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 3600000)
    const meetingID: string = uuidv7()
    // API reference: https://developers.google.com/calendar/api/v3/reference/events/insert
    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Meeting ${meetingID}`,
        start: { dateTime: now.toISOString() },
        end: { dateTime: oneHourLater.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: meetingID,
          },
        },
      },
    })
    return res.data.hangoutLink
  } catch (e) {
    console.error('Failed to insert an event to Google Calendar.', e)
    return ''
  }
}
