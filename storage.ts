import * as AWS from 'aws-sdk'

const BUCKET_NAME: string = process.env.S3_BUCKET_NAME
const s3 = new AWS.S3({ region: process.env.AWS_REGION })

/**
 * Writes data to an S3 bucket.
 *
 * @param {string} key - The key (filename) under which the data will be stored.
 * @param {string} data - The data to be stored.
 * @returns {Promise<boolean>} - Returns true if the write operation is successful, otherwise false.
 */
export const write = async (key: string, data: string): Promise<boolean> => {
  try {
    await s3.putObject({ Bucket: BUCKET_NAME, Key: key, Body: data }).promise()
    return true
  } catch (e) {
    console.error(`storage.write: ${key}`, e)
    return false
  }
}

/**
 * Reads data from an S3 bucket.
 *
 * @param {string} key - The key (filename) of the data to be read.
 * @returns {Promise<AWS.S3.Body | null>} - Returns the data if the read operation is successful, otherwise null.
 */
export const read = async (key: string): Promise<AWS.S3.Body | null> => {
  try {
    const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise()
    return data.Body
  } catch (e) {
    console.error(`storage.read: ${key}`, e)
    return null
  }
}
