package com.gu.paperround.client

import com.typesafe.scalalogging.LazyLogging
import okhttp3.{Request, Response}

object PaperRoundRestRequestMaker extends LazyLogging {

  def apply(response: Request => Response, config: PaperRoundConfig): FormRequestMaker =
    new FormRequestMaker(
      headers = Map("x-api-key" -> config.apiKey.value),
      baseUrl = config.url,
      getResponse = response,
    )

}
