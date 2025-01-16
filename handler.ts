import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda'
import 'source-map-support/register'
import {
  createMessage,
  createUser,
  createUserFromState,
  extractUser,
} from './slack'
import {
  extractSetupFromState,
  generateAuthUrl,
  getAuthUser,
  prepareForAuth,
  prepareForCallback,
  prepareForUse,
  readyToUse,
  verifyAuth,
  verifyCallback,
} from './auth'
import { createEvent } from './calendar'
import { SlackMessage, SlackUser } from './types'
import { APIGatewayProxyEventQueryStringParameters } from 'aws-lambda/trigger/api-gateway-proxy'

/**
 * Handles the creation of a Google Hangouts Meet event.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event object.
 * @returns {Promise<APIGatewayProxyResult>} - The response object containing the status code and body.
 */
export const create: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const user: SlackUser = extractUser(event.body)
  if (await readyToUse(user)) {
    const url: string = await createEvent(await getAuthUser(user))
    const message: SlackMessage = createMessage(
      [`<${url}|Open Hangouts Meet>`, `Meeting URL: ${url}`],
      'everyone'
    )
    return {
      statusCode: 200,
      body: JSON.stringify(message),
    }
  } else {
    const setup: string = await prepareForAuth(user)
    const url = `https://${process.env.LAMBDA_URL}/auth?id=${user.id}&team=${user.team}&setup=${setup}`
    const message: SlackMessage = createMessage([
      'Thank you for using *Google Hangouts Meet slash command* :tada:',
      '*Usage:* Just run command `/meet` to get a meeting URL.',
      'Before you start using this command, please give permission. Click the link below.',
      `<${url}|Allow to access Google Calendar>`,
    ])
    return {
      statusCode: 200,
      body: JSON.stringify(message),
    }
  }
}

/**
 * Handles the authentication process for the Google Calendar API.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event object.
 * @returns {Promise<APIGatewayProxyResult>} - The response object containing the status code and body.
 */
export const auth: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(JSON.stringify(event.queryStringParameters))
  const user = createUser(event.queryStringParameters)
  const { setup } = event.queryStringParameters
  if (await verifyAuth(user, setup)) {
    const url = generateAuthUrl(user, setup)
    await prepareForCallback(user, setup)
    return {
      statusCode: 302,
      headers: {
        Location: url,
      },
      body: '',
    }
  } else {
    return {
      statusCode: 401,
      body: 'Authentication failed. Please check your credentials and try again.',
    }
  }
}

/**
 * Handles the callback from the Google Calendar API after authentication.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event object.
 * @returns {Promise<APIGatewayProxyResult>} - The response object containing the status code and body.
 */
export const callback: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { code, state }: APIGatewayProxyEventQueryStringParameters =
    event.queryStringParameters
  const user: SlackUser = createUserFromState(state)
  const setup: string = extractSetupFromState(state)
  if (await verifyCallback(user, setup)) {
    await prepareForUse(user, code)
    return {
      statusCode: 200,
      body: 'Callback verification successful. User is ready to use the service.',
    }
  } else {
    return {
      statusCode: 400,
      body: 'Callback verification failed. Invalid setup or user information.',
    }
  }
}
