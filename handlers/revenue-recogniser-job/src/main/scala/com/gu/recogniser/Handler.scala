package com.gu.recogniser

import com.amazonaws.services.lambda.runtime._
import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.gu.effects.RawEffects
import com.gu.util.config.Stage

import java.io.{ByteArrayInputStream, ByteArrayOutputStream, InputStream, OutputStream}

object Handler extends RequestStreamHandler {

  def main(args: Array[String]): Unit = {
    println("main: STARTING!")
    // FOR TESTING
    handleRequest(
      new ByteArrayInputStream(Array[Byte]()), new ByteArrayOutputStream(), new Context {
        override def getAwsRequestId: String = ???

        override def getLogGroupName: String = ???

        override def getLogStreamName: String = ???

        override def getFunctionName: String = ???

        override def getFunctionVersion: String = ???

        override def getInvokedFunctionArn: String = ???

        override def getIdentity: CognitoIdentity = ???

        override def getClientContext: ClientContext = ???

        override def getRemainingTimeInMillis: Int = ???

        override def getMemoryLimitInMB: Int = ???

        override def getLogger: LambdaLogger = new LambdaLogger {
          override def log(message: String): Unit = println("LOG: " + message)

          override def log(message: Array[Byte]): Unit = ???
        }
      }
    )
    println("main: FINISHED!")
  }

  //referenced in cloudformation, change with care
  def handleRequest(
    input: InputStream,
    output: OutputStream,
    context: Context
  ): Unit = {
    def log(message: String) = context.getLogger.log(message)
    val stage = RawEffects.stage

    log("starting lambda!")

    // TODO write the code to go here!

    log("finished successfully - sending metric!")
    putMetric(stage)
  }

  /*
  this is alarmed in the cfn
   */
  def putMetric(stage: Stage): Unit = {
    AwsCloudWatch.metricPut(MetricRequest(
      MetricNamespace("support-service-lambdas"),
      MetricName("job-succeeded"),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue(stage.value),
        MetricDimensionName("app") -> MetricDimensionValue("revenue-recogniser-job")
      )
    ))
  }

}
