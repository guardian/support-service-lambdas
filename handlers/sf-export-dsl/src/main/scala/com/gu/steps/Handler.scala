package com.gu.steps

import java.io.{InputStream, OutputStream, OutputStreamWriter}
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.steps.CompiledSteps.LambdaId
import play.api.libs.json.{JsValue, Json, OFormat}

import scala.util.{Failure, Success, Try}

object Handler {

  case class Initial(data: String)
  case class NextState(moreData: String)
  case class FinalState(finalData: String)

  def step1(initial: Initial): NextState = {
    println("RUN STEP 1")
    NextState(initial.data)
  }

  def step2(nextState: NextState): FinalState = {
    println("RUN STEP 2")
    FinalState(nextState.moreData)
  }

  // see the s-w tests for a nicer way to compose:
  // https://github.com/guardian/support-workers/blob/7faa9f7709d007bb027ae450526193687e401b92/src/test/scala/com/gu/support/workers/EndToEndSpec.scala#L26
  lazy val program: TaskStep[Initial, NextState, WaitStep[EndStep[NextState, FinalState]]] = TaskStep(step1, WaitStep(Time(3), EndStep(step2)))

  implicit lazy val iF: OFormat[Initial] = Json.format[Initial]
  implicit lazy val nF: OFormat[NextState] = Json.format[NextState]
  implicit lazy val fF: OFormat[FinalState] = Json.format[FinalState]

  lazy val interpretedViaJson = InterpJson[Initial].apply(program)

  def main(args: Array[String]): Unit = {

    val interpretedDirectly = InterpLocal(Initial("hello"), program)
    println(s"interpretedDirectly: $interpretedDirectly")

    println(s"interpretedViaJson: $interpretedViaJson")

    val runLocallyViaJson = CompiledSteps.runLocal(interpretedViaJson)(Initial("hello"))
    println(s"runLocallyViaJson: $runLocallyViaJson")

    val handlerFunctionName = this.getClass.getCanonicalName.replaceAll("""\$$""", "") + "::apply"
    val cfn = CompiledSteps.toCFN(interpretedViaJson, handlerFunctionName, ENV_VAR)
    println(s"CFN: $cfn")
    val cfnRaw = Json.prettyPrint(Json.toJson(cfn))
    val path = Files.write(Paths.get("target/generated.cfn.json"), cfnRaw.getBytes(StandardCharsets.UTF_8))
    println(s"path: $path")
  }

  lazy val ENV_VAR: String = "LAMBDA_ID"

  // this is the entry point
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val res = for {
      envLambdaId <- Try(System.getenv(ENV_VAR))
      lambdaId <- LambdaId.fromEnv(envLambdaId)
      output <- CompiledSteps.runSingle(interpretedViaJson, lambdaId, Json.parse(inputStream)) match {
        case None => Failure(new RuntimeException("oops probably couldn't deserialise"))
        case Some(result) => Success(result)
      }
    } yield output
    res match {
      case Failure(ex) => throw ex
      case Success(outputJS) => outputForAPIGateway(outputStream, outputJS)
    }
  }

  def outputForAPIGateway(outputStream: OutputStream, jsonResponse: JsValue): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    println(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

}
