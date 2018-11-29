package com.gu.steps

import com.gu.steps.WireCFN.{WireCode, WireEnvironment, WireFnGetAtt, WireFnSub, WireLambdaFunctionProperties, WireProps, WireResource, WireRoleProps, WireStateMachineProps}
import com.gu.steps.WireStateMachine.{WireState, smW}
import play.api.libs.json._

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
  ): WireCFN = {
    val ids = compiledSteps.steps.zipWithIndex.map({ case (_, num) => LambdaId(num) })
    val roleName = "TheRole"
    val statesRoleName = "TheStatesRole"
    val stateMachineName = "TheStateMachine"
    val lambdas = ids.map { lambdaId =>
      val fn = WireResource(
        "AWS::Lambda::Function",
        Properties = WireLambdaFunctionProperties(
          Description = s"auto generated lambda ${lambdaId.value}",
          Code = WireCode(
            "johnd-dist",
            "step.jar"
          ),
          Handler = handler,
          Environment = WireEnvironment(
            Map(envVar -> s"${lambdaId.value}")
          ),
          Role = WireFnGetAtt(roleName, "Arn")
        )
      )
      StepData(s"GeneratedLambda${lambdaId.value}", fn)
    }
    val role = (roleName, WireResource("AWS::IAM::Role", WireRoleProps(WireCFN.assumeLambda, None, None)))
    val roleState = (statesRoleName, WireResource("AWS::IAM::Role", WireRoleProps(WireCFN.assumeStatesExecution, Some("/"), Some(WireCFN.policyStatesExecution))))
    val nonTerminalstates = lambdas.sliding(2).toList.map({
      case (stepData :: next :: Nil) =>
        (stepData.logicalName, WireState(stepData.logicalName, Some(next.logicalName)))
    })
    val terminalState = lambdas.lastOption.map(stepData => (stepData.logicalName, WireState(stepData.logicalName, None)))
    val wireStateMachine = WireStateMachine(lambdas.head.logicalName, (nonTerminalstates ++ terminalState).toMap)
    val labelToLogicalName = lambdas.map(aaa => (aaa.logicalName, aaa.logicalName)).toMap
    val subStateMachine = WireFnSub(Json.stringify(Json.toJsObject(wireStateMachine)(smW)), labelToLogicalName)
    val stateMachine = (stateMachineName, WireResource("AWS::StepFunctions::StateMachine", WireStateMachineProps(subStateMachine, WireFnGetAtt(statesRoleName, "Arn"))))
    WireCFN(
      Resources = (role :: roleState :: stateMachine :: lambdas.map(aaa => (aaa.logicalName, aaa.res))).toMap
    )
  }

  case class StepData(logicalName: String, res: WireResource[WireLambdaFunctionProperties])

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
{ "Fn::GetAtt" : [ "logicalNameOfResource", "attributeName" ] }
 */
  case class WireFnGetAtt(`Fn::GetAtt`: List[String])
  object WireFnGetAtt {
    def apply(logicalNameOfResource: String, attributeName: String): WireFnGetAtt =
      new WireFnGetAtt(List(logicalNameOfResource, attributeName))
  }
  implicit val fnGetAttW = Json.writes[WireFnGetAtt]

  /*
  {
                    "Fn::Sub": [
                        "{\n  \"Comment\": \"A Hello World AWL example using an AWS Lambda function\",\n  \"StartAt\": \"HelloWorld\",\n  \"States\": {\n    \"HelloWorld\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"${lambdaArn}\",\n      \"End\": true\n    }\n  }\n}",
                        {
                            "lambdaArn": {
                                "Fn::GetAtt": [
                                    "MyLambdaFunction",
                                    "Arn"
                                ]
                            }
                        }
                    ]
                }
   */
  case class WireFnSub(`Fn::Sub`: JsArray)
  object WireFnSub {
    def apply(template: String, map: Map[String, String]): WireFnSub =
      new WireFnSub(JsArray(List(JsString(template), Json.toJsObject(map.mapValues(functionLogicalName => WireFnGetAtt(functionLogicalName, "Arn"))))))
  }
  implicit val fnSubW = Json.writes[WireFnSub]

  /*
{
  "Type" : "AWS::Lambda::Function",
  "Properties" : {
    "Code" : Code,
    "DeadLetterConfig" : DeadLetterConfig,
    "Description" : String,
    "Environment" : Environment,
    "FunctionName" : String,
    "Handler" : String,
    "KmsKeyArn" : String,
    "MemorySize" : Integer,
    "ReservedConcurrentExecutions" : Integer,
    "Role" : String,
    "Runtime" : String,
    "Timeout" : Integer,
    "TracingConfig" : TracingConfig,
    "VpcConfig" : VPCConfig,
    "Tags" : [ Resource Tag, ... ]
  }
}
 */
  case class WireEnvironment(Variables: Map[String, String])
  implicit val envW = Json.writes[WireEnvironment]

  /*
{
  "S3Bucket" : String,
  "S3Key" : String,
  "S3ObjectVersion" : String,
  "ZipFile" : String
}
 */
  case class WireCode(
    S3Bucket: String,
    S3Key: String
  )
  implicit val codeW = Json.writes[WireCode]

  case class WireLambdaFunctionProperties(
    Description: String,
    Code: WireCode,
    Handler: String,
    Environment: WireEnvironment,
    Role: WireFnGetAtt,
    MemorySize: Int = 1536,
    Runtime: String = "java8",
    Timeout: Int = 300
  ) extends WireProps
  implicit val fPropW = Json.writes[WireLambdaFunctionProperties]

  case class WireResource[+PROPS](
    Type: String,
    Properties: PROPS
  )
  implicit def funW[PROPS: Writes] = Json.writes[WireResource[PROPS]]

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
  val assumeLambda: Map[String, JsValue] = Map(
    "Version" -> JsString("2012-10-17"),
    "Statement" -> JsArray(List(
      JsObject(Map(
        "Effect" -> JsString("Allow"),
        "Principal" -> JsObject(Map(
          "Service" -> JsString("lambda.amazonaws.com")
        )),
        "Action" -> JsString("sts:AssumeRole")
      ))
    ))
  )
  case class WireRoleProps(
    AssumeRolePolicyDocument: Map[String, JsValue],
    Path: Option[String],
    Policies: Option[JsArray]
  ) extends WireProps
  implicit val roleW = Json.writes[WireRoleProps]

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
  val assumeStatesExecution: Map[String, JsValue] = Map(
    "Version" -> JsString("2012-10-17"),
    "Statement" -> JsArray(List(
      JsObject(Map(
        "Effect" -> JsString("Allow"),
        "Principal" -> JsObject(Map(
          "Service" -> JsString("states.eu-west-1.amazonaws.com")
        )),
        "Action" -> JsString("sts:AssumeRole")
      ))
    ))
  )
  val policyStatesExecution: JsArray = JsArray(List(
    JsObject(Map(
      "PolicyName" -> JsString("StatesExecutionPolicy"),
      "PolicyDocument" -> JsObject(Map(
        "Version" -> JsString("2012-10-17"),
        "Statement" -> JsArray(List(
          JsObject(Map(
            "Effect" -> JsString("Allow"),
            "Action" -> JsArray(List(
              JsString("lambda:InvokeFunction")
            )),
            "Resource" -> JsString("*")
          ))
        ))
      ))
    ))
  ))

  /*

        "MyStateMachine": {
            "Type": "AWS::StepFunctions::StateMachine",
            "Properties": {
                "DefinitionString": {
                    "Fn::Sub": [
                        "{\n  \"Comment\": \"A Hello World AWL example using an AWS Lambda function\",\n  \"StartAt\": \"HelloWorld\",\n  \"States\": {\n    \"HelloWorld\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"${lambdaArn}\",\n      \"End\": true\n    }\n  }\n}",
                        {
                            "lambdaArn": {
                                "Fn::GetAtt": [
                                    "MyLambdaFunction",
                                    "Arn"
                                ]
                            }
                        }
                    ]
                },
                "RoleArn": {
                    "Fn::GetAtt": [
                        "StatesExecutionRole",
                        "Arn"
                    ]
                }
            }
        }
   */
  case class WireStateMachineProps(
    DefinitionString: WireFnSub,
    RoleArn: WireFnGetAtt
  ) extends WireProps
  implicit val statePropsW = Json.writes[WireStateMachineProps]

  sealed trait WireProps
  implicit val resW: OWrites[WireProps] = {
    case p: WireLambdaFunctionProperties => Json.toJsObject(p)(fPropW) // explicit needed to avoid infinite recursion
    case p: WireRoleProps => Json.toJsObject(p)(roleW)
    case p: WireStateMachineProps => Json.toJsObject(p)(statePropsW)
  }

  implicit val cfnW = Json.writes[WireCFN]

}
case class WireCFN(
  AWSTemplateFormatVersion: String = "2010-09-09",
  Description: String = "Auto generated Lambda state machine",
  Resources: Map[String, WireResource[WireProps]]
)

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
