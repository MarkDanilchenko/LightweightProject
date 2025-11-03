import UserEntity from "@server/user/user.entity";

type RequestWithUser = Request & { user: UserEntity };

export { RequestWithUser };
// type SignInLocal = z.infer<typeof signInLocalSchema>;
//
// type SignUpLocal = z.infer<typeof signUpLocalSchema>;
//
// type Profile = z.infer<typeof profileSchema>;
//
