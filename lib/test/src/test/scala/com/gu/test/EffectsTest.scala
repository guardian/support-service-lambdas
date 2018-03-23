package com.gu.test

import org.scalatest.Tag

// an edge test checks that the integration points are working. They would need aws credentials usually.
object EffectsTest extends Tag("com.gu.test.EffectsTest")
object HealthCheck extends Tag("com.gu.test.HealthCheck")
