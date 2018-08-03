package manualTest

import com.amazonaws.auth._
import com.amazonaws.auth.profile.ProfileCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.simpleemail.AmazonSimpleEmailServiceAsyncClientBuilder
import com.amazonaws.services.simpleemail.model._
import org.apache.log4j.Logger

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Failure, Success}

object AwsSESSend {

  val logger = Logger.getLogger(getClass.getName)

  case class EmailAddress(value: String) extends AnyVal

  case class EmailSubject(value: String) extends AnyVal
  case class EmailBody(value: String) extends AnyVal

  val apply: EmailAddress => List[EmailAddress] => EmailSubject => EmailBody => Future[Unit] = { from => to => subject => body =>
    val sesClient = AmazonSimpleEmailServiceAsyncClientBuilder
      .standard()
      .withCredentials(aws.CredentialsProvider)
      .withRegion(Regions.EU_WEST_1)
      .build()
    logger.info(s"Sending message to SES")
    val request = new SendEmailRequest()
      .withDestination(new Destination().withToAddresses(to.map(_.value): _*))
      .withSource(from.value)
      .withMessage(new Message()
        .withSubject(new Content(subject.value))
        .withBody(new Body().withHtml(new Content(body.value))))
    val messageResult = AwsAsync(sesClient.sendEmailAsync, request)

    messageResult.onComplete(_ => sesClient.shutdown())
    messageResult.transform {
      case Success(result) =>
        logger.info(s"Successfully sent message to $to: $result")
        Success(())
      case Failure(throwable) =>
        logger.error(s"Failed to send message due to $to due to:", throwable)
        Failure(throwable)
    }
  }
}

object aws {
  val ProfileName = "membership"

  lazy val CredentialsProvider = new AWSCredentialsProviderChain(
    new EnvironmentVariableCredentialsProvider,
    new SystemPropertiesCredentialsProvider,
    new ProfileCredentialsProvider(ProfileName),
    new InstanceProfileCredentialsProvider(false),
    new EC2ContainerCredentialsProviderWrapper
  )

}
