import {
  Controller,
  Request,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpException,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
  Query,
  Inject,
  Body,
} from '@nestjs/common';

import { AuthenticatedGuard } from './common/guards/authenticated.guard';
import { LoginGuard } from './common/guards/login.guard';
import { UserEntity } from './schemas/user.entity';
import { ClientProxy } from '@nestjs/microservices';
import { UserDocument } from './schemas/user.schema';
import { User } from './decorators/user.decorator';
import { CreateNftDto } from './schemas/create-nft.dto';

type Request = Express.Request & {
  user: UserDocument;
};

@SerializeOptions({
  excludePrefixes: ['_'],
})
@Controller()
export class AppController {
  constructor(
    @Inject('USERS_SERVICE') private users_microservice: ClientProxy,
    @Inject('PRODUCTS_SERVICE') private products_microservice: ClientProxy,
  ) {}

  @HttpCode(200)
  @UseGuards(LoginGuard)
  @Post('auth/login')
  async login(@Request() req, @Body() body) {}

  @UseGuards(AuthenticatedGuard)
  @Post('/auth/logout')
  async logout(@Request() req) {
    console.log('logged out');
    req.logout();
  }

  @Get('auth/getnonce')
  async getNonce(@Query('public_address') public_addr) {
    const noncePromise = new Promise((resolve, reject) => {
      this.users_microservice
        .send<string>({ cmd: 'get-nonce' }, public_addr)
        .subscribe({
          next: (nonce) => {
            resolve({ public_address: public_addr, nonce: nonce });
          },
          error: (err) => {
            reject(
              new HttpException('Malformed Request', HttpStatus.BAD_REQUEST),
            );
          },
        });
    });
    return noncePromise;
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthenticatedGuard)
  @Post('/products/create-nft')
  createNFT(@Body() body: CreateNftDto, @User() user: UserDocument) {
    this.products_microservice
      .send<any>(
        { cmd: 'create-nft' },
        {
          ...body,
          creator: user.public_address,
        },
      )
      .subscribe({
        next: (nft) => console.log(nft),
      });
  }

  // @UseInterceptors(ClassSerializerInterceptor)
  // @UseGuards(AuthenticatedGuard)
  // @Post('/home')
  // getHome(@Request() req): UserEntity {
  //   return new UserEntity(req.user);
  // }
}
