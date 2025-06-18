package com.gu.cas

case class Config(config: com.typesafe.config.Config) {
  val emergencySubscriberAuthPrefix = config.getString("emergency.subscriber.auth.prefix")
}
