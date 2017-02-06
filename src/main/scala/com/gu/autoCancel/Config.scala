package com.gu.autoCancel

import java.lang.System._
import java.nio.ByteBuffer
import java.nio.charset.Charset
import com.amazonaws.services.kms.AWSKMSClientBuilder
import com.amazonaws.services.kms.model.DecryptRequest
import com.amazonaws.util.Base64

object Config extends Logging {

  def setConfig: ZuoraRestConfig = {
    logger.info(s"Attempting to set config...")
    val restUrl = getenv("ZuoraRestUrl")
    val restUserName = getenv("ZuoraUsername")
    val restPassword = if (getenv("ZuoraSecretDecryption") == "skip") {
      getenv("ZuoraPassword")
    } else { decryptEnvironmentVariable("ZuoraPassword") }
    ZuoraRestConfig(restUrl, restUserName, restPassword)
  }

  def decryptEnvironmentVariable(variableName: String): String = {
    logger.info(s"Decrypting environment variable for $variableName")
    val encryptedKey = Base64.decode(System.getenv(variableName))
    val awsKmsClient = AWSKMSClientBuilder.defaultClient
    val decryptRequest = new DecryptRequest().withCiphertextBlob(ByteBuffer.wrap(encryptedKey))
    val plainTextKey = awsKmsClient.decrypt(decryptRequest).getPlaintext
    val decryptedKey = new String(plainTextKey.array(), Charset.forName("UTF-8"))
    decryptedKey
  }

}
