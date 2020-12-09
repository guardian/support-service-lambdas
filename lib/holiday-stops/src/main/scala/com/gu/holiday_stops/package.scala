package com.gu

import zio.Has

package object holiday_stops {
  type Configuration = Has[Configuration.Service]
}
