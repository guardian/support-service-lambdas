import java.nio.charset.StandardCharsets

import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, ObjectCannedACL, PutObjectRequest}

import scala.io.Source

val creds = ProfileCredentialsProvider.create("membership")
val cli = S3Client.builder
  .credentialsProvider(creds)
  .region(Region.EU_WEST_1)
  .build()

val req = PutObjectRequest.builder
  .bucket("kelvin-test-1")
  .key("testing124")
  .acl(ObjectCannedACL.BUCKET_OWNER_READ)
  .build()
val body = RequestBody.fromString("some other text", StandardCharsets.UTF_8)
val response = cli.putObject(req, body)

val request = GetObjectRequest.builder
  .bucket("kelvin-test-1")
  .key("testing124")
  .build()
val inputStream = cli.getObject(request)
val rawJson = Source.fromInputStream(inputStream).mkString
