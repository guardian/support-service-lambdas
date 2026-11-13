package com.gu.zuora.baton

import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import com.gu.util.zuora.ZuoraGetAccessToken
import okhttp3.{Request, Response}

object BatonZuoraOAuth {
  def getAccessToken(
      config: BatonZuoraRestConfig,
      stage: Stage,
      response: Request => Response,
  ): Either[ConfigFailure, String] =
    new ZuoraGetAccessToken(config.batonZuora.oauth, stage.value, response)
      .get()
      .toDisjunction
      .left
      .map(error => ConfigFailure(s"Failed to authenticate with Zuora: ${error.message}"))
}
