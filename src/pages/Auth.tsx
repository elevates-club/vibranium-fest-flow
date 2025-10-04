import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, LogIn, Mail, Lock, User, GraduationCap, MapPin, Calendar, Phone } from 'lucide-react';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  phone: z.string().trim().min(10, { message: "Phone number must be at least 10 digits" }),
  department: z.string().trim().min(1, { message: "Department is required" }),
  year: z.number().min(1).max(5, { message: "Year must be between 1-5" }),
  college: z.string().trim().min(1, { message: "College name is required" }),
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    year: 1,
    college: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const validatedData = signUpSchema.parse({
          ...formData,
          year: Number(formData.year),
        });

        const { error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              phone: validatedData.phone,
              department: validatedData.department,
              year: validatedData.year,
              college: validatedData.college,
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Registration Successful!",
          description: "Please check your email to verify your account.",
        });
        
        setIsSignUp(false);
      } else {
        const validatedData = signInSchema.parse(formData);

        console.log('Attempting sign in with:', validatedData.email);
        
        // Check if this is a test user (hardcoded for now)
        const testUsers = [
          { email: 'admin@vibranium.com', password: '123456', role: 'admin', name: 'Admin User' },
          { email: 'organizer@vibranium.com', password: '123456', role: 'organizer', name: 'Event Organizer' },
          { email: 'volunteer@vibranium.com', password: '123456', role: 'volunteer', name: 'Volunteer Helper' },
          { email: 'coordinator@vibranium.com', password: '123456', role: 'coordinator', name: 'Event Coordinator' },
          { email: 'staff@vibranium.com', password: '123456', role: 'staff', name: 'Staff Member' },
          { email: 'participant@vibranium.com', password: '123456', role: 'participant', name: 'Regular Participant' }
        ];

        const testUser = testUsers.find(user => 
          user.email === validatedData.email && user.password === validatedData.password
        );

        console.log('Test user check:', { testUser });

        if (testUser) {
          // This is a test user - create a real Supabase user
          console.log('Creating Supabase user for test account:', testUser.email);
          
          try {
            // First try to sign in with existing user
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: testUser.email,
              password: testUser.password,
            });

            if (!signInError && signInData.user) {
              console.log('Test user signed in successfully:', signInData.user);
              
              // Add role to user_roles table if not exists
              const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                  user_id: signInData.user.id,
                  role: testUser.role
                }, {
                  onConflict: 'user_id,role'
                });

              if (roleError) {
                console.warn('Could not add role:', roleError.message);
                // Try to update the existing participant role
                const { error: updateError } = await supabase
                  .from('user_roles')
                  .update({ role: testUser.role })
                  .eq('user_id', signInData.user.id)
                  .eq('role', 'participant');
                
                if (updateError) {
                  console.warn('Could not update role:', updateError.message);
                }
              }

              toast({
                title: "Login Successful!",
                description: `Welcome back, ${testUser.name}!`,
              });
              
              navigate('/dashboard');
              return;
            }

            // If sign in failed, try to create the user
            console.log('Sign in failed, creating new user...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: testUser.email,
              password: testUser.password,
              options: {
                data: {
                  first_name: testUser.name.split(' ')[0],
                  last_name: testUser.name.split(' ').slice(1).join(' '),
                  role: testUser.role
                }
              }
            });

            if (signUpError) {
              console.error('Error creating test user:', signUpError);
              throw new Error('Failed to create test user account');
            }

            if (signUpData.user) {
              console.log('Test user created successfully:', signUpData.user);
              
              // Add role to user_roles table
              const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                  user_id: signUpData.user.id,
                  role: testUser.role
                }, {
                  onConflict: 'user_id,role'
                });

              if (roleError) {
                console.warn('Could not add role:', roleError.message);
                // Try to update the existing participant role
                const { error: updateError } = await supabase
                  .from('user_roles')
                  .update({ role: testUser.role })
                  .eq('user_id', signUpData.user.id)
                  .eq('role', 'participant');
                
                if (updateError) {
                  console.warn('Could not update role:', updateError.message);
                }
              }

              toast({
                title: "Account Created!",
                description: `Welcome, ${testUser.name}! Your test account has been created.`,
              });
              
              navigate('/dashboard');
              return;
            }

          } catch (error) {
            console.error('Error with test user authentication:', error);
            throw new Error('Failed to authenticate test user');
          }
        }

        // If not a temp user, try Supabase Auth
        console.log('Not a temp user, trying Supabase Auth...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        console.log('Supabase Auth response:', { data, error });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: error.message || "An error occurred during authentication",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? Number(value) : value
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              {isSignUp ? 'Join Vibranium' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Create your account to start your techfest journey'
                : 'Sign in to access your dashboard and events'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="pl-10"
                          placeholder="John"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="Computer Science"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="year"
                          name="year"
                          type="number"
                          min="1"
                          max="5"
                          value={formData.year}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="college">College</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="college"
                          name="college"
                          value={formData.college}
                          onChange={handleInputChange}
                          className="pl-10"
                          placeholder="ABC College"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="hero"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Processing..."
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:text-primary-glow"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Link to="/events">
                <Button variant="ghost" size="sm">
                  ← Back to Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;