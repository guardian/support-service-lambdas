package manualTest

import AwsSESSend.{EmailAddress, EmailBody, EmailSubject}

import scala.concurrent.Await
import scala.concurrent.duration.Duration
import scala.util.{Failure, Random, Success}
import scala.concurrent.ExecutionContext.Implicits.global

object AWSSESSendManualTest extends App {

  val data = s"hello${Random.nextInt(10000)}"

  private val testEmailAddress = EmailAddress("john.duffell@guardian.co.uk")
  private val subject = EmailSubject(s"test email ${Random.nextInt(10000)} from $AWSSESSendManualTest")
  private val body = EmailBody(s"this is a test email ${Random.nextInt(10000)}")

  println(s"sending email to $testEmailAddress")
  val r = AwsSESSend.apply(testEmailAddress)(List(testEmailAddress))(subject)(body)
  r.onComplete {
    case Success(result) =>
      println(s"res: $result - please check your email")
    case Failure(exception) =>
      println(s"failed with: $exception - please check your email")
      exception.printStackTrace(System.out)
  }
  Await.result(r, Duration.Inf)
  println("complete!")

}
