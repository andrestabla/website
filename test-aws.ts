import { AwsClient } from 'aws4fetch'

async function test() {
  const aws = new AwsClient({
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    service: 's3',
    region: 'auto'
  })
  
  const url = new URL('https://account.r2.cloudflarestorage.com/bucket/key.pdf')
  const signed = await aws.sign(url, {
    method: 'PUT',
    aws: { signQuery: true },
    headers: {
      'Content-Type': 'application/pdf'
    }
  })
  console.log(signed.url)
}

test().catch(console.error)
