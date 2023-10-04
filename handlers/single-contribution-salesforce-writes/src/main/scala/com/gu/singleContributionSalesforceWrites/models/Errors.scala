package com.gu.singleContributionSalesforceWrites.models

sealed trait HandlerError

case class JsonDecodeError(message: String) extends HandlerError
case class HttpRequestError(message: String) extends HandlerError
case class AwsSecretsManagerError(message: String) extends HandlerError
