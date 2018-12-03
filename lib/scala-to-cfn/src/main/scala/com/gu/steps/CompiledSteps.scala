package com.gu.steps

import com.gu.gaia.Template
import com.gu.gaia.aws.iam.role.{Policy, Role}
import com.gu.gaia.aws.lambda.function.{Code, Environment, Function}
import com.gu.gaia.aws.stepfunctions.statemachine.StateMachine
import com.gu.gaia.primitives.{Expression, GetAtt, Sub}
import com.gu.steps.WireStateMachine.{WireState, smW}
import play.api.libs.json._
import com.gu.gaia.syntax._

import scala.util.Try

// this can be used to build the CFN and each lambda
case class CompiledSteps[FROM, FINAL](
  init: FROM => JsValue,
  steps: List[JsValue => Option[JsValue]],
  toResult: JsValue => Option[FINAL]
)

object CompiledSteps {

  def runLocal[FROM: Writes, FINAL](
    compiledSteps: CompiledSteps[FROM, FINAL]
  )(from: FROM): Option[FINAL] = {

    val fromAsJsValue = compiledSteps.init(from)
    val finalMaybeJsValue = compiledSteps.steps.foldLeft[Option[JsValue]](Some(fromAsJsValue)) {
      case (maybeJsValue, nextStep) =>
        maybeJsValue.flatMap(nextStep)
    }
    finalMaybeJsValue.flatMap(compiledSteps.toResult)

  }

  case class LambdaId(value: Int)

  object LambdaId {
    def fromEnv(envId: String): Try[LambdaId] = Try(Integer.parseInt(envId)).map(LambdaId.apply)
  }

  def toCFN[FROM, FINAL]( // can validate with https://github.com/awslabs/statelint
    compiledSteps: CompiledSteps[FROM, FINAL],
    handler: String,
    envVar: String
  ): Template = {
    val ids = compiledSteps.steps.zipWithIndex.map({ case (_, num) => LambdaId(num) })
    val roleName = "TheRole"
    val statesRoleName = "TheStatesRole"
    val stateMachineName = "TheStateMachine"
    val lambdas = ids.map { lambdaId =>
      Function(
        resourceName = s"GeneratedLambda${lambdaId.value}",
        role = roleName,
        handler = handler,
        code = Code().withS3Bucket("johnd-dist").withS3Key("step.jar"),
        runtime = "java8"
      )
        .withEnvironment(Environment(Some(Map(envVar -> lambdaId.value.toString))))
        .withMemorySize(1536)
        .withTimeout(300)
    }

    val role = Role(roleName, WireCFN.assumeLambda)
    val roleState = Role(statesRoleName, WireCFN.assumeStatesExecution, Some("/"), Some(List(Policy(WireCFN.policyStatesExecution, "StatesExecutionPolicy"))))
    val nonTerminalstates = lambdas.sliding(2).toList.map({
      case lambda :: next :: Nil =>
        (lambda.resourceName, WireState(lambda.resourceName, Some(next.resourceName)))
      case _: List[Function] => ??? // NOT POSSIBLE - sliding only returns 2s
    })
    val terminalState = lambdas.lastOption.map(fun => (fun.resourceName, WireState(fun.resourceName, None)))
    val wireStateMachine = WireStateMachine(lambdas.head.resourceName, (nonTerminalstates ++ terminalState).toMap)
    val labelToLogicalName: Map[String, Expression[String]] = lambdas.map(aaa => aaa.resourceName -> Expression(aaa.resourceName)).toMap
    val subStateMachine = Sub(Json.stringify(Json.toJsObject(wireStateMachine)(smW)), labelToLogicalName)
    val stateMachine = StateMachine(stateMachineName, subStateMachine, GetAtt(statesRoleName, "Arn"))

    Template()
      .withDescription("Auto generated Lambda state machine")
      .withResource(role)
      .withResource(roleState)
      .withResource(stateMachine)
      .withResources(lambdas)
  }

  def runSingle[FROM, FINAL](
    compiledSteps: CompiledSteps[FROM, FINAL],
    name: LambdaId,
    input: JsValue
  ): Option[JsValue] = {
    compiledSteps.steps(name.value)(input)
  }

}
object WireCFN {

  /*
  "LambdaExecutionRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": "lambda.amazonaws.com"
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                }
            }
        }
   */
  val assumeLambda: Map[String, AnyRef] = Map(
    "Version" -> "2012-10-17",
    "Statement" -> List(
      Map(
        "Effect" -> "Allow",
        "Principal" -> Map(
          "Service" -> "lambda.amazonaws.com"
        ),
        "Action" -> "sts:AssumeRole"
      )
    )
  )

  /*

        "StatesExecutionRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {
                                "Service": [
                                    {
                                        "Fn::Sub": "states.${AWS::Region}.amazonaws.com"
                                    }
                                ]
                            },
                            "Action": "sts:AssumeRole"
                        }
                    ]
                },
                "Path": "/",
                "Policies": [
                    {
                        "PolicyName": "StatesExecutionPolicy",
                        "PolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Action": [
                                        "lambda:InvokeFunction"
                                    ],
                                    "Resource": "*"
                                }
                            ]
                        }
                    }
                ]
            }
        }
   */
  val assumeStatesExecution: Map[String, AnyRef] = Map(
    "Version" -> "2012-10-17",
    "Statement" -> List(
      Map(
        "Effect" -> "Allow",
        "Principal" -> Map(
          "Service" -> "states.eu-west-1.amazonaws.com"
        ),
        "Action" -> "sts:AssumeRole"
      )
    )
  )
  val policyStatesExecution: AnyRef = Map(
    "Version" -> "2012-10-17",
    "Statement" -> List(
      Map(
        "Effect" -> "Allow",
        "Action" -> List(
          "lambda:InvokeFunction"
        ),
        "Resource" -> "*"
      )
    )
  )

}

object WireStateMachine {
  /*
  "LambdaState": {
    "Type": "Task",
    "Resource": "arn:aws:lambda:us-east-1:123456789012:function:HelloWorld",
    "Next": "NextState"
  }
   */
  case class WireState(
    Type: String = "Task",
    Resource: String,
    Next: Option[String], // either Next or End but not both
    End: Option[Boolean]
  )
  object WireState {
    def apply(
      logicalName: String,
      nextName: Option[String]
    ): WireState = new WireState(Resource = "${" + logicalName + "}", Next = nextName, End = if (nextName.isEmpty) Some(true) else None)
  }
  implicit val stateW = Json.writes[WireState]

  implicit val smW = Json.writes[WireStateMachine]

}
/*
{
  "Comment": "A Hello World example of the Amazon States Language using a Pass state",
  "StartAt": "HelloWorld",
  "States": {
    "HelloWorld": {
      "Type": "Pass",
      "Result": "Hello World!",
      "End": true
    }
  }
}
 */
case class WireStateMachine(
  StartAt: String,
  States: Map[String, WireState]
)
